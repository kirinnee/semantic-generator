import {Rectangle} from "../src/classLibrary/Rectangle";
import {Shape} from "../src/classLibrary/Shape";

describe("Rectangle", () => {
    const rect: Shape = new Rectangle(5, 10);
    it("should return correct area", () => {
        expect(rect.area).toBe(50);
    });

    it("should return correct parameter", () => {
        expect(rect.parameter()).toBe(30);
    });
});
