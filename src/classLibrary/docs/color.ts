import Color from "color";

interface ThemeColors {
    colorPrimary: string
    colorPrimaryDark: string
    colorPrimaryDarker: string
    colorPrimaryDarkest: string
    colorPrimaryLight: string
    colorPrimaryLighter: string
    colorPrimaryLightest: string
}

function GenerateThemeColor(c: string): ThemeColors {
    const clr = Color(c);
    return {
        colorPrimary: clr.hex(),
        colorPrimaryDark: clr.darken(0.1).hex(),
        colorPrimaryDarker: clr.darken(0.15).hex(),
        colorPrimaryDarkest: clr.darken(0.3).hex(),
        colorPrimaryLight: clr.lighten(0.1).hex(),
        colorPrimaryLighter: clr.lighten(0.15).hex(),
        colorPrimaryLightest: clr.lighten(0.3).hex(),
    };
}

export {ThemeColors, GenerateThemeColor};
