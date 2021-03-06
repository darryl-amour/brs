const Expr = require("../../lib/parser/Expression");
const Stmt = require("../../lib/parser/Statement");
const { Interpreter } = require("../../lib/interpreter");
const brs = require("brs");
const { Lexeme } = brs.lexer;
const { BrsString } = brs.types;

let interpreter;

describe("interpreter for-each loops", () => {
    const arrayMembers = [
            new BrsString("foo"),
            new BrsString("bar"),
            new BrsString("baz")
    ];

    beforeEach(() => {
        interpreter = new Interpreter();
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    it("iterates across all elements of an array", () => {
        const emptyBlock = new Stmt.Block([]);
        const receivedElements = [];
        const emptyBlockSpy = jest.spyOn(emptyBlock, "accept").mockImplementation(_interpreter =>
            receivedElements.push(
                _interpreter.environment.get(
                    { kind: Lexeme.Identifier, text: "element", line: -1 }
                )
            )
        );

        const statements = [
            new Stmt.Assignment(
                { kind: Lexeme.Identifier, text: "array", line: 1 },
                new Expr.ArrayLiteral(
                    arrayMembers.map(member => new Expr.Literal(member))
                )
            ),
            new Stmt.ForEach(
                { kind: Lexeme.Identifier, text: "element", line: 2 },
                new Expr.Variable({ kind: Lexeme.Identifier, text: "array", line: 2 }),
                emptyBlock
            )
        ];

        interpreter.exec(statements);

        expect(emptyBlockSpy).toHaveBeenCalledTimes(3);
        expect(receivedElements).toEqual(arrayMembers);
    });

    it("doesn't exceute the body for empty arrays", () => {
        const emptyBlock = new Stmt.Block([]);
        const emptyBlockSpy = jest.spyOn(emptyBlock, "accept");

        const statements = [
            new Stmt.Assignment(
                { kind: Lexeme.Identifier, text: "empty", line: 1 },
                new Expr.ArrayLiteral([])
            ),
            new Stmt.ForEach(
                { kind: Lexeme.Identifier, text: "element", line: 2 },
                new Expr.Variable({ kind: Lexeme.Identifier, text: "empty", line: 2 }),
                emptyBlock
            )
        ];

        interpreter.exec(statements);

        expect(emptyBlockSpy).not.toHaveBeenCalled();
    });

    it("leaves the loop variable in-scope after loop", () => {
        const emptyBlock = new Stmt.Block([]);

        const statements = [
            new Stmt.Assignment(
                { kind: Lexeme.Identifier, text: "array", line: 1 },
                new Expr.ArrayLiteral(
                    arrayMembers.map(member => new Expr.Literal(member))
                )
            ),
            new Stmt.ForEach(
                { kind: Lexeme.Identifier, text: "element", line: 2 },
                new Expr.Variable({ kind: Lexeme.Identifier, text: "array", line: 2 }),
                emptyBlock
            )
        ];

        interpreter.exec(statements);

        expect(
            interpreter.environment.get(
                { kind: Lexeme.Identifier, text: "element", line: -1 }
            )
        ).toEqual(arrayMembers[arrayMembers.length - 1]);
    });

    it("exits early when it encounters 'exit for'", () => {
        const block = new Stmt.Block([
            new Stmt.ExitFor()
        ]);
        const blockSpy = jest.spyOn(block, "accept");

        const statements = [
            new Stmt.Assignment(
                { kind: Lexeme.Identifier, text: "array", line: 1 },
                new Expr.ArrayLiteral(
                    arrayMembers.map(member => new Expr.Literal(member))
                )
            ),
            new Stmt.ForEach(
                { kind: Lexeme.Identifier, text: "element", line: 2 },
                new Expr.Variable({ kind: Lexeme.Identifier, text: "array", line: 2 }),
                block
            )
        ];

        interpreter.exec(statements);

        expect(blockSpy).toHaveBeenCalledTimes(1);
    });
});