type TestCase<T,Y> = {subject: T, expected: Y};
type TestCases<T,Y> = TestCase<T, Y>[];

export {
    TestCase,
    TestCases,
}
