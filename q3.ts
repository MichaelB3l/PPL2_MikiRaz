import { Exp, Program, CExp,
         isDefineExp, isProgram, isNumExp, isBoolExp, isStrExp,
         isPrimOp, isVarRef, isAppExp, isIfExp, isProcExp } from './L3/L3-ast';
import { Result, makeOk } from './shared/result';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/

const unaryOps = ["not", "number?", "boolean?", "symbol?", "string?"];

const translateOp = (op: string): string =>
    op === '=' || op === 'eq?' ? '==' : op;

const toStr = (exp: Exp | CExp | Program): string => {
    if (isProgram(exp))
        return exp.exps.map(toStr).join('\n');

    if (isDefineExp(exp))
        return exp.var.var + " = " + toStr(exp.val);

    if (isNumExp(exp))  return exp.val.toString();
    if (isBoolExp(exp)) return exp.val ? 'True' : 'False';
    if (isStrExp(exp))  return '"' + exp.val + '"';
    if (isVarRef(exp))  return exp.var;
    if (isPrimOp(exp))  return exp.op;

    if (isIfExp(exp))
        return "(" + toStr(exp.then) + " if " + toStr(exp.test) + " else " + toStr(exp.alt) + ")";

    if (isProcExp(exp)) {
        const params = exp.args.map(a => a.var).join(',');
        const body = toStr(exp.body[exp.body.length - 1]);
        return "(lambda " + params + " : " + body + ")";
    }

    if (isAppExp(exp)) {
        if (isPrimOp(exp.rator)) {
            const op = translateOp(exp.rator.op);
            if (unaryOps.includes(exp.rator.op))
                return "(" + op + " " + toStr(exp.rands[0]) + ")";
            return "(" + exp.rands.map(toStr).join(" " + op + " ") + ")";
        }
        const rator = toStr(exp.rator);
        const rands = exp.rands.map(toStr).join(',');
        return rator + "(" + rands + ")";
    }

    return 'unsupported';
};

export const l2ToPython = (exp: Exp | Program): Result<string> =>
    makeOk(toStr(exp));
