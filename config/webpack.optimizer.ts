import TerserPlugin from "terser-webpack-plugin";

const opti = {
    minimizer: [
        new TerserPlugin({
            terserOptions: {},
        }),
    ],
};

export { opti };
