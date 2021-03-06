const Expr = require("../../lib/parser/Expression");
const Stmt = require("../../lib/parser/Statement");
const { Interpreter } = require("../../lib/interpreter");
const brs = require("brs");
const { Lexeme } = brs.lexer;
const { BrsString, Int32, ValueKind } = brs.types;

const { identifier } = require("../parser/ParserTests");

let interpreter;

describe("interpreter calls", () => {
    beforeEach(() => {
        interpreter = new Interpreter();
    });

    it("calls functions", () => {
        const call = new Stmt.Expression(
            new Expr.Call(
                new Expr.Variable(identifier("UCase")),
                { kind: Lexeme.RightParen, text: ")", line: 1 },
                [ new Expr.Literal(new BrsString("h@lL0")) ]
            )
        );
        const [ result ] = interpreter.exec([call]);
        expect(result.toString()).toBe("H@LL0");
    });

    it("sets a new `m` pointer when called from an associative array", () => {
        const ast = [
            new Stmt.Assignment(
                { kind: Lexeme.Identifier, text: "foo", line: 2 },
                new Expr.AALiteral([
                    {
                        name: new BrsString("setMId"),
                        value: new Expr.Function(
                            [],
                            ValueKind.Void,
                            new Stmt.Block([
                                new Stmt.DottedSet(
                                    new Expr.Variable({ kind: Lexeme.Identifier, text: "m", line: 3 }),
                                    { kind: Lexeme.Identifier, text: "id", line: 3 },
                                    new Expr.Literal(new BrsString("this is an ID"))
                                )
                            ])
                        )
                    }
                ])
            ),
            new Stmt.Expression(
                new Expr.Call(
                    new Expr.DottedGet(
                        new Expr.Variable({ kind: Lexeme.Identifier, text: "foo", line: 5 }),
                        { kind: Lexeme.Identifier, text: "setMId" }
                    ),
                    { kind: Lexeme.RightParen, text: ")", line: 2 },
                    [ ] // no args required
                )
            )
        ];

        interpreter.exec(ast);

        let foo = interpreter.environment.get({ kind: Lexeme.Identifier, text: "foo", line: -1 });
        expect(foo.kind).toBe(ValueKind.Object);
        expect(
            foo.get(new BrsString("id"))
        ).toEqual(new BrsString("this is an ID"));
    });

    it("errors when not enough arguments provided", () => {
        const call = new Stmt.Expression(
            new Expr.Call(
                new Expr.Variable(identifier("UCase")),
                { kind: Lexeme.RightParen, text: ")", line: 1 },
                [] // no arugments
            )
        );

        expect(() => interpreter.exec([call])).toThrow(/UCase.*arguments/);
    });

    it("errors when too many arguments are provided", () => {
        const call = new Stmt.Expression(
            new Expr.Call(
                new Expr.Variable(identifier("UCase")),
                { kind: Lexeme.RightParen, text: ")", line: 1 },
                [
                    new Expr.Literal(new BrsString("h@lL0")),
                    new Expr.Literal(new BrsString("too many args")),
                ]
            )
        );

        expect(() => interpreter.exec([call])).toThrow(/UCase.*arguments/);
    });

    it("errors when argument types are incorrect", () => {
        const call = new Stmt.Expression(
            new Expr.Call(
                new Expr.Variable(identifier("UCase")),
                { kind: Lexeme.RightParen, text: ")", line: 1 },
                [
                    new Expr.Literal(new Int32(5)),
                ]
            )
        );

        expect(() => interpreter.exec([call])).toThrow(/Argument '.+' must be of type/);
    });

    it("errors when return types don't match", () => {
        const ast = [
            new Stmt.Function(
                { kind: Lexeme.Identifier, text: "foo", line: 1 },
                new Expr.Function(
                    [],
                    ValueKind.String,
                    new Stmt.Block([
                        new Stmt.Return(
                            { kind: Lexeme.Return, text: "return", line: 2, isReserved: true },
                            new Expr.Literal(new Int32(5))
                        )
                    ])
                )
            ),
            new Stmt.Expression(
                new Expr.Call(
                    new Expr.Variable(identifier("foo")),
                    { kind: Lexeme.RightParen, text: ")", line: 2 },
                    [] // no args required
                )
            )
        ];

        expect(() => interpreter.exec(ast)).toThrow(
            /\[Line .\] Attempting to return value of type Integer, but function foo declares return value of type String/
        );
    });

    it("errors when returning from a void return", () => {
        const ast = [
            new Stmt.Function(
                { kind: Lexeme.Identifier, text: "foo", line: 1 },
                new Expr.Function(
                    [],
                    ValueKind.Void,
                    new Stmt.Block([
                        new Stmt.Return(
                            { kind: Lexeme.Return, text: "return", line: 2, isReserved: true },
                            new Expr.Literal(new Int32(5))
                        )
                    ])
                )
            ),
            new Stmt.Expression(
                new Expr.Call(
                    new Expr.Variable(identifier("foo")),
                    { kind: Lexeme.RightParen, text: ")", line: 2 },
                    [] // no args required
                )
            )
        ];

        expect(() => interpreter.exec(ast)).toThrow(
            /\[Line .\] Attempting to return value of non-void type/
        );
    });

    it("errors when returning void from a non-void return", () => {
        const ast = [
            new Stmt.Function(
                { kind: Lexeme.Identifier, text: "foo", line: 1 },
                new Expr.Function(
                    [],
                    ValueKind.String,
                    new Stmt.Block([
                        new Stmt.Return(
                            { kind: Lexeme.Return, text: "return", line: 2, isReserved: true }
                        )
                    ])
                )
            ),
            new Stmt.Expression(
                new Expr.Call(
                    new Expr.Variable(identifier("foo")),
                    { kind: Lexeme.RightParen, text: ")", line: 2 },
                    [] // no args required
                )
            )
        ];

        expect(() => interpreter.exec(ast)).toThrow(
            /\[Line .\] Attempting to return void value/
        );
    });
});
