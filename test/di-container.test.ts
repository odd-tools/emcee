import {DIContainer, EntityScope} from "../src/di-container";
import {A, B, C} from "./di-container.testclasses";

describe("construction dependencies", () => {
    let diContainer: DIContainer;
    beforeEach(() => {
        diContainer = new DIContainer();
        A.constructorCounter = 0;
        B.constructorCounter = 0;
        C.constructorCounter = 0;
    });
    it('one construction dependency, straight order', async () => {
        diContainer.addEntity({
            entity: A,
        });
        diContainer.addEntity({
            entity: B,
            entityName: 'target',
            dependencies: [A]
        });
        const instance = await diContainer.getInstance<B>('target');
        expect(instance).not.toEqual(null);
        expect(instance instanceof B).toBe(true);
        expect(instance.talk()).toEqual('B A');
        expect(A.constructorCounter).toBe(1);
        expect(B.constructorCounter).toBe(1);
    });
    it('one construction dependency, reverse order', async () => {
        diContainer.addEntity({
            entity: B,
            entityName: 'target',
            dependencies: [A]
        });
        diContainer.addEntity({
            entity: A,
        });
        const instance = await diContainer.getInstance<B>('target');
        expect(instance).not.toEqual(null);
        expect(instance instanceof B).toBe(true);
        expect(instance.talk()).toEqual('B A');
        expect(A.constructorCounter).toBe(1);
        expect(B.constructorCounter).toBe(1);
    });
    it('multiple construction dependencies, singletons', async () => {
        const instanceCPromise = diContainer.getInstance<C>('targetC');
        diContainer.addEntity({
            entity: C,
            entityName: 'targetC',
            dependencies: [A, B]
        });
        diContainer.addEntity({
            entity: B,
            entityName: 'targetB',
            shareEntity: true,
            dependencies: [A]
        });
        diContainer.addEntity({
            entity: A
        });
        const instanceB = await diContainer.getInstance<B>('targetB');
        const instanceC = await instanceCPromise;
        expect(instanceB != null && instanceC != null).toBe(true);
        expect(instanceC.talk()).toEqual('C A B A');
        expect(instanceB.talk()).toEqual('B A');
        expect(A.constructorCounter).toBe(1);
        expect(B.constructorCounter).toBe(1);
        expect(C.constructorCounter).toBe(1);
    });
    it('multiple construction dependencies, one prototype', async () => {
        const instanceCPromise = diContainer.getInstance<C>('targetC');
        diContainer.addEntity({
            entity: C,
            entityName: 'targetC',
            dependencies: [A, B]
        });
        diContainer.addEntity({
            entity: B,
            entityName: 'targetB',
            shareEntity: true,
            dependencies: [A]
        });
        diContainer.addEntity({
            entity: A,
            scope: EntityScope.Prototype
        });
        const instanceB = await diContainer.getInstance<B>('targetB');
        const instanceC = await instanceCPromise;
        expect(instanceB != null && instanceC != null).toBe(true);
        expect(instanceC.talk()).toEqual('C A B A');
        expect(instanceB.talk()).toEqual('B A');
        expect(A.constructorCounter).toBe(2);
        expect(B.constructorCounter).toBe(1);
        expect(C.constructorCounter).toBe(1);
    });
    it('simple factory test', async () => {
        diContainer.addEntity({
            entity: (): B => {
               let a: A = new A();
               return new B(a);
            },
            entityName: 'targetB'
        });
        const instanceB = await diContainer.getInstance<B>('targetB');
        expect(instanceB.talk()).toEqual('B A');
        expect(A.constructorCounter).toBe(1);
        expect(B.constructorCounter).toBe(1);
        expect(instanceB instanceof B).toBe(true);
    });
});