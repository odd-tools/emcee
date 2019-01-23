export class A {
    public static constructorCounter = 0;

    public constructor() {
        A.constructorCounter++;
    }

    public talk(): string {
        return 'A';
    }
}

export class B {
    private dependency: A;
    public static constructorCounter = 0;

    public constructor(dependency: A) {
        this.dependency = dependency;
        B.constructorCounter++;
    }

    public talk(): string {
        return 'B ' + this.dependency.talk();
    }
}

export class C {
    private dep1: A;
    private dep2: B;
    public static constructorCounter = 0;

    public constructor(dep1: A, dep2: B) {
        this.dep1 = dep1;
        this.dep2 = dep2;
        C.constructorCounter++;
    }

    public talk(): string {
        return 'C ' + this.dep1.talk() +' '+ this.dep2.talk();
    }
}


