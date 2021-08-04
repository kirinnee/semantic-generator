const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const meta = require('./meta.json');


const preLinks = (meta.navbar.preLinks ?? []).map(({name, url}) => {
    return {
        position: 'left',
        label: name,
        href: url,
    };
});

const tabs = (meta.navbar.tabs ?? []).map(({name, folder, id}) => {
    return {
        type: 'doc',
        docId: `${folder}/${id ?? 'index'}`,
        position: 'left',
        label: name,
    };
});


const postLinks = (meta.navbar.postLinks ?? []).map(({title, url}) => {
    return {
        position: 'right',
        label: title,
        href: url,
    };
});

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
    customFields: {
        button: meta.landing.button,
    },
    title: meta.title,
    tagline: meta.description,
    url: meta.url,
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'throw',
    favicon: meta.favicon,
    organizationName: meta.github.org, // Usually your GitHub org/user name.
    projectName: meta.github.project, // Usually your repo name.
    themeConfig: {
        navbar: {
            title: meta.title,
            logo: {
                alt: meta.title + ' logo',
                src: meta.logo,
                href: meta.navbar.logoUrl,
            },
            items: [
                ...preLinks,
                ...tabs,
                {
                    type: 'docsVersionDropdown',
                },
                ...postLinks,
                {
                    href: `https://github.com/${meta.github.org}/${meta.github.project}`,
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            copyright: `Copyright © ${new Date().getFullYear()} ${meta.organization}`,
        },
        prism: {
            theme: lightCodeTheme,
            darkTheme: darkCodeTheme,
        },
    },
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    remarkPlugins: [
                        require('remark-hint')
                    ],
                    routeBasePath: meta.landing.enable ? undefined : '/',
                    sidebarPath: require.resolve('./sidebars.js'),
                    editUrl: `https://github.com/${meta.github.org}/${meta.github.project}/edit/main${meta.landing.enable ? '' : '/' + meta.sourceFolder}`,
                },
                blog: false,
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],
    plugins: [
        [
            require.resolve('@easyops-cn/docusaurus-search-local'),
            {
                hashed: true,
                docsRouteBasePath: meta.landing.enable ? `/${meta.sourceFolder}` : '/',
            },
        ],
        [
            '@docusaurus/plugin-pwa',
            {
                debug: true,
                offlineModeActivationStrategies: [
                    'appInstalled',
                    'standalone',
                    'queryString',
                ],
                pwaHead: meta.pwaHead,
            },
        ],
    ],
};
