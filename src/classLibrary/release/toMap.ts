function ToMap<V>(i: { [s: string]: V }): Map<string, V> {
    return new Map<string, V>(Object.entries(i));
}

export {ToMap};
