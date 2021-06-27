import {Shape} from "./Shape";

class Square implements Shape {
    private readonly side: number;

    constructor(side: number) {
        this.side = side;
    }

    get area(): number {
        return this.side * this.side;
    }

    parameter(): number {
        return this.side * 4;
    }

}

export {Square};
