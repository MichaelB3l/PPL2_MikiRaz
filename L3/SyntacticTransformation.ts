import { ClassExp, ProcExp, Exp, Program, CExp, Binding,
         isClassExp, isProcExp, isIfExp, isLetExp, isAppExp, isDefineExp, isProgram, isLitExp, isAtomicExp,
         makeIfExp, makeAppExp, makePrimOp, makeLitExp, makeVarRef, makeVarDecl, makeProcExp,
         makeBinding, makeLetExp, makeDefineExp } from "./L3-ast";
import { makeSymbolSExp } from "./L3-value";
import { Result, makeOk, makeFailure, bind, mapResult, mapv } from "../shared/result";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp => { // <====
    const msgVar = makeVarRef('msg');                    
    const errorLit = makeLitExp(makeSymbolSExp('error')); 
    let dispatch: CExp = errorLit;                       
    for (let i = exp.methods.length - 1; i >= 0; i--) { 
        const b = exp.methods[i];                       
        const test = makeAppExp(makePrimOp('eq?'),       
            [msgVar, makeLitExp(makeSymbolSExp(b.var.var))]);
        const methodBody = isProcExp(b.val) && b.val.args.length === 0 && b.val.body.length === 1
            ? b.val.body[0]                              
            : b.val;                                     
        dispatch = makeIfExp(test, methodBody, dispatch); 
    }
    return makeProcExp(exp.fields, [makeProcExp([makeVarDecl('msg')], [dispatch])]); 
};

/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
export const transform = (exp: Exp | Program): Result<Exp | Program> =>                  //<====
    isProgram(exp) ? mapv(mapResult(transformExp, exp.exps), (exps: Exp[]) => ({...exp, exps})) :
    transformExp(exp);

const transformExp = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? mapv(transformCExp(exp.val), (val: CExp) => makeDefineExp(exp.var, val)) :
    transformCExp(exp as CExp);

const transformCExp = (exp: CExp): Result<CExp> =>

    isAtomicExp(exp) ? makeOk(exp) :
    isLitExp(exp) ? makeOk(exp) :
    isClassExp(exp) ? makeOk(class2proc(exp)) :
    isIfExp(exp) ? bind(transformCExp(exp.test), (test: CExp) =>
                   bind(transformCExp(exp.then), (then: CExp) =>
                   mapv(transformCExp(exp.alt), (alt: CExp) =>
                        makeIfExp(test, then, alt)))) :
    isProcExp(exp) ? mapv(mapResult(transformCExp, exp.body), (body: CExp[]) =>
                         makeProcExp(exp.args, body)) :
    isLetExp(exp) ? bind(mapResult((b: Binding) =>
                             mapv(transformCExp(b.val), (val: CExp) => makeBinding(b.var.var, val)),
                         exp.bindings), (bindings: Binding[]) =>
                    mapv(mapResult(transformCExp, exp.body), (body: CExp[]) =>
                         makeLetExp(bindings, body))) :
    isAppExp(exp) ? bind(transformCExp(exp.rator), (rator: CExp) =>
                    mapv(mapResult(transformCExp, exp.rands), (rands: CExp[]) =>
                         makeAppExp(rator, rands))) :
    makeFailure('Never');
