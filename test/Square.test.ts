import {Shape} from "../src/classLibrary/Shape";
import {Square} from "../src/classLibrary/Square";


describe("Square", () => {
    const square: Shape = new Square(5);

    it("should return correct area", () => {
        expect(square.area).toBe(25);
    });

    it("should return correct parameter", () => {
        expect(square.parameter()).toBe(20);
    });
});
