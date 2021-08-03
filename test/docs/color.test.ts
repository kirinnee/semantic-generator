import {GenerateThemeColor, ThemeColors} from "../../src/classLibrary/docs/color";

describe("Color Theme generator", () => {

    it("should generate 7 colors from a single color", () => {

        const ex: ThemeColors = {
            colorPrimary: "#61B3B3",
            colorPrimaryDark: "#51A8A8",
            colorPrimaryDarker: "#4C9E9E",
            colorPrimaryDarkest: "#3F8282",
            colorPrimaryLight: "#74BCBC",
            colorPrimaryLighter: "#7DC0C0",
            colorPrimaryLightest: "#99CECE"
        };
        const subj = "#61b3b3";
        const actual = GenerateThemeColor(subj);

        expect(actual).toStrictEqual(ex);
    });
});
