import {InputConfig, InputConfigValid} from "../../src/classLibrary/docs/configuration";

describe("InputConfigValidation", () => {
    it("should return empty array if nothing is wrong", function () {
        const valid1: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: false,
            },
            url: "https://atomi.cloud",
            navbar: {
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };
        const valid2: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d",
                        svg: "svg.svg"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ]
            },
            url: "https://atomi.cloud",
            navbar: {
                logoUrl: "https://cyanprint.dev",
                prelinks: [
                    {
                        name: "hello",
                        url: "https://google.com"
                    }
                ],
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };
        const valid3: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d",
                        svg: "svg.svg"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ],
                button: {
                    to: "hello",
                    text: "Get started in 1min"
                }
            },
            url: "https://atomi.cloud",
            navbar: {
                postlinks: [
                    {
                        name: "hello",
                        url: "https://google.com"
                    }
                ],
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };

        const ex1: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: false,
            },
            url: "https://atomi.cloud",
            navbar: {
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };
        const ex2: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d",
                        svg: "svg.svg"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ]
            },
            url: "https://atomi.cloud",
            navbar: {
                logoUrl: "https://cyanprint.dev",
                prelinks: [
                    {
                        name: "hello",
                        url: "https://google.com"
                    }
                ],
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };
        const ex3: InputConfig = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d",
                        svg: "svg.svg"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ],
                button: {
                    to: "hello",
                    text: "Get started in 1min"
                }
            },
            url: "https://atomi.cloud",
            navbar: {
                postlinks: [
                    {
                        name: "hello",
                        url: "https://google.com"
                    }
                ],
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };

        const act1 = InputConfigValid(valid1);
        const act2 = InputConfigValid(valid2);
        const act3 = InputConfigValid(valid3);
        expect(act1.isOk()).toBe(true);
        expect(act2.isOk()).toBe(true);
        expect(act3.isOk()).toBe(true);
        expect(act1.unwrap()).toStrictEqual(ex1);
        expect(act2.unwrap()).toStrictEqual(ex2);
        expect(act3.unwrap()).toStrictEqual(ex3);
    });

    it("should return array of error if it is incorrect", function () {
        const valid1 = {
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: false,
            },
            url: "https://atomi.cloud",
            navbar: {
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };

        const valid2 = {
            title: "CyanPrint",
            organization: "AtomiCloud",
            description: "Production ready projects in seconds",
            github: {},
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ]
            },
            url: "https://atomi.cloud",
            navbar: {
                logoUrl: "https://cyanprint.dev",
                prelinks: [
                    {
                        name: "hello",
                        url: "https://google.com"
                    }
                ],
                tabs: [
                    {
                        name: "UserGuide",
                        folder: "user",
                    }
                ]
            }
        };

        const valid3 = {
            title: "CyanPrint",
            description: "Production ready projects in seconds",
            github: {
                org: "AtomiCloud",
                project: "cyanprint"
            },
            logo: "logo.svg",
            color: "#008b8b",
            historyDir: "history",
            staticDir: "static",
            landing: {
                enable: true,
                features: [
                    {
                        title: "first",
                        desc: "d",
                        svg: "svg.svg"
                    },
                    {
                        title: "second",
                        desc: "d",
                        svg: "svg2.svg"
                    }
                ],
                button: {
                    to: 5,
                    text: "Get started in 1min"
                }
            },
            url: "https://atomi.cloud",
            navbar: {}
        };

        const ex1 = [
            "\u001b[36mtitle\u001b[39m: Expected a string, but received: undefined"
        ];

        const ex2 = [
            "\u001b[36mgithub.org\u001b[39m: Expected a string, but received: undefined",
            "\u001b[36mgithub.project\u001b[39m: Expected a string, but received: undefined",
            "\u001b[36mlanding.features.0.svg\u001b[39m: Expected a string, but received: undefined"
        ];

        const ex3 = [
            "\u001b[36morganization\u001b[39m: Expected a string, but received: undefined",
            "\u001b[36mlanding.button.to\u001b[39m: Expected a string, but received: 5",
            "\u001b[36mnavbar.tabs\u001b[39m: Expected an array value, but received: undefined"
        ];

        const act1 = InputConfigValid(valid1);
        const act2 = InputConfigValid(valid2);
        const act3 = InputConfigValid(valid3);

        expect(act1.isOk()).toBe(false);
        expect(act1.unwrapErr()).toStrictEqual(ex1);


        expect(act2.isOk()).toBe(false);
        expect(act2.unwrapErr()).toStrictEqual(ex2);

        expect(act3.isOk()).toBe(false);
        expect(act3.unwrapErr()).toStrictEqual(ex3);
    });


});
