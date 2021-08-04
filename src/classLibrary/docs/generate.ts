import {Content, ContentToBuffer, FileMetadata} from "../engine/vfs";
import {IFileFactory} from "../engine/basicFileFactory";
import {Err, Ok, Option, Result} from "@hqoss/monads";
import {Resolver, Values} from "../engine/resolver";
import {GenerateThemeColor, ThemeColors} from "./color";
import {IWritable, Writer} from "../engine/writer";
import {Feature, HeadNode, InputConfig, MetaConfig} from "./configuration";
import {PromiseResultAll, PromiseResultTupleAll, Wrap} from "../util";
import favicons from "favicons";
import {parse} from "node-html-parser";
import * as path from "path";
import {PromiseResult} from "../resultUtil";


class Generator {

    private readonly templateFileFactory: IFileFactory;
    private readonly sourceFileFactory: IFileFactory;

    private readonly tmpWriter: Writer;
    private readonly resolvers: Resolver[];


    resolveStatic(config: InputConfig): PromiseResult<IWritable[], string[]> {
        const subFact = this.sourceFileFactory.Sub(config.staticDir);
        const meta = subFact.Scan("**/*").Each(x => x.original = path.join("static", x.original));
        return subFact.Read(meta).map(files => files.Map(file => IWritable.File(file)));
    }

    resolveDocs(config: InputConfig): PromiseResult<IWritable[], string[]> {
        const f = config.navbar.tabs.Map(x => this.sourceFileFactory.Scan(`${x.folder}/**/*`)).Flatten<FileMetadata>();
        return this.sourceFileFactory.Read(f).map(files =>
            files
                .Each(x => x.meta.original = path.join("docs", x.meta.original))
                .Map(file => IWritable.File(file))
        );
    }

    resolveMeta(config: InputConfig, pwaHead: HeadNode[], targetFolder: string): IWritable {
        const meta: MetaConfig = {
            pwaHead: pwaHead,
            description: config.description,
            favicon: "img/favicon.ico",
            logo: "img/logo.svg",
            github: config.github,
            navbar: {
                logoUrl: config.navbar.logoUrl,
                postLinks: config.navbar.postlinks ?? [],
                preLinks: config.navbar.prelinks ?? [],
                tabs: config.navbar.tabs,
            },
            landing: {
                enable: config.landing.enable,
                button: config.landing.button,
            },
            organization: config.organization,
            url: config.url,
            title: config.title,
            targetFolder,
        };

        if (meta.landing.button) meta.landing.button.to = path.join(targetFolder, meta.landing.button.to);

        return IWritable.File({
            meta: {
                from: "",
                original: "meta.json"
            },
            content: Content.String(JSON.stringify(meta))
        });
    }

    resolveVersions(config: InputConfig): PromiseResult<IWritable[], string[]> {
        const subFact = this.sourceFileFactory.Sub(config.historyDir);

        return subFact.Read(subFact.Scan("**/*"))
            .map(files => files.Map(file => IWritable.File(file)));
    }

    resolveSideBar(config: InputConfig): string {
        return config.navbar.tabs.Map(x =>
            `sidebar${x.name.split("").Where(x => x.IsAlphanumeric()).join("")}: [{type: 'autogenerated', dirName: '${x.folder}' }],`
        ).join("\n");
    }

    resolveFeatures(feature: Feature[]): PromiseResult<[IWritable[], string], string[]> {

        return PromiseResultAll(feature.Map(({
            svg, desc, title
        }, idx) =>
            this.sourceFileFactory.ReadSingle(svg)
                .map(svgFile => {
                    svgFile.meta.original = `static/feature/feat-${idx}.svg`;
                    return {
                        desc,
                        title,
                        svgFile,
                        require: `require('../../static/feature/feat-${idx}.svg').default`
                    };
                }),
        )).map(features =>
            [
                features.Map(({svgFile}) => IWritable.File(svgFile)),
                `[${features.reduce((a, b) => `${a}\n{ title: "${b.title}", desc: "${b.desc}", Svg: ${b.require} },`, "")}]`
            ] as [IWritable[], string]
        );
    }

    resolveImages(config: InputConfig): PromiseResult<[IWritable[], string[]], string> {
        return this.sourceFileFactory.ReadSingle(config.logo)
            .map(svg => ContentToBuffer(svg.content))
            .andThenAsync(svg =>
                new Promise<Result<[IWritable[], string[]], string>>(r => {
                    favicons(svg, {
                        appName: config.title,
                        path: "/assets",
                        appShortName: config.title,
                        appDescription: config.description,
                        theme_color: config.color,
                        appleStatusBarStyle: "black-translucent",
                        display: "standalone",
                        scope: "/",
                        icons: {
                            android: true,
                            appleIcon: true,
                            appleStartup: true,
                            coast: true,
                            favicons: true,
                            firefox: true,
                            windows: true,
                            yandex: false,
                        },
                    }, function (err, resp) {
                        if (err) {
                            r(Err(err.message));
                            return;
                        }

                        // copy favicon
                        const favico: Option<IWritable> = Wrap(resp.images.Find(f => f.name === "favicon.ico"))
                            .map(f => {
                                const nBuffer = f.contents.slice(0);
                                return IWritable.FaviconImage({
                                    name: path.join("static/img", f.name),
                                    contents: nBuffer
                                });
                            });

                        if (favico.isNone()) {
                            r(Err("no favicon found"));
                            return;
                        }


                        const writables: IWritable[] = [
                            ...resp.images
                                .Each(x => x.name = path.join("static/assets", x.name))
                                .Map(x => IWritable.FaviconImage(x)),
                            ...resp.files
                                .Each(x => x.name = path.join("static/assets", x.name))
                                .Map(x => IWritable.FaviconFile(x)),
                            IWritable.File({
                                meta: {
                                    from: "",
                                    original: "static/img/logo.svg",
                                },
                                content: Content.Binary(svg),
                            }),
                            favico.unwrap()
                        ];
                        const result: [IWritable[], string[]] = [writables, resp.html];
                        r(Ok(result));
                    });
                })
            );
    }

    resolveTemplates(colorTheme: ThemeColors, landing: boolean, sidebar: string, features: string): PromiseResult<IWritable[], string[]> {
        const vals: Values = {
            flags: {
                landing,
            },
            variables: {
                features,
                sidebar,
                ...colorTheme
            }
        };
        const result = this.templateFileFactory.Scan("**/*");
        const resolvedMeta = this.resolvers.reduce((a, b) => b.ResolveMeta(vals, a), result);
        return this.templateFileFactory.Read(resolvedMeta)
            .map(
                files =>
                    this.resolvers
                        .reduce((file, resolver) => resolver.ResolveContent(vals, file), files)
                        .Map(x => IWritable.File(x))
            );
    }

    headToHeaderNode(i: string[]): HeadNode[] {
        return i.Map(html => parse(html).firstChild as unknown as { rawTagName: string, attributes: { [s: string]: string } })
            .Map(node => {
                return {
                    tagName: node.rawTagName,
                    ...node.attributes,
                };
            });
    }

    generateTemp(config: InputConfig, targetFolder: string): PromiseResult<string, string[]> {

        console.log("resolving sidebar and theme...");
        const sidebar = this.resolveSideBar(config);
        const theme = GenerateThemeColor(config.color);

        console.log("resolving statics...");
        const staticResults = this.resolveStatic(config);
        console.log("resolving versions...");
        const versionResults = this.resolveVersions(config);
        console.log("resolving docs...");
        const docsResult = this.resolveDocs(config);
        console.log("resolving images...");
        const imageResults = this.resolveImages(config).mapErr(x => [x]);
        console.log("resolving features");
        const featureResults = this.resolveFeatures(config.landing?.features ?? []);

        return PromiseResultTupleAll(staticResults, versionResults, docsResult, imageResults, featureResults)
            .mapErr((a) => a.Flatten<string>())
            .map(([statics, versions, docs, [faviconFiles, header], [featureFile, featureCode]]) =>
                [[...docs, ...faviconFiles, ...featureFile, ...statics, ...versions], header, featureCode] as [files: IWritable[], elements: string[], code: string]
            )
            .map(([files, elements, code]) =>
                [[this.resolveMeta(config, this.headToHeaderNode(elements), targetFolder), ...files], code] as [files: IWritable[], code: string]
            )
            .andThenAsync(([files, code]) =>
                this.resolveTemplates(theme, config.landing?.enable ?? false, sidebar, code).map(w => [...w, ...files])
            ).andThenAsync(
                async x => {
                    const r = await this.tmpWriter.BatchWrite(x);
                    return r.match({
                        some: (err: string[]): Result<string, string[]> => Err(err),
                        none: (): Result<string, string[]> => Ok(this.tmpWriter.Path),
                    });
                }
            );
    }


    constructor(templateFileFactory: IFileFactory, sourceFileFactory: IFileFactory, tmpWriter: Writer, resolvers: Resolver[]) {
        this.templateFileFactory = templateFileFactory;
        this.sourceFileFactory = sourceFileFactory;

        this.tmpWriter = tmpWriter;
        this.resolvers = resolvers;
    }
}


export {Generator};
