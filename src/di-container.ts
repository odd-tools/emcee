import {TriggeredPromise} from "@odd-tools/triggered-promise";

export interface OnFulfilled {
    (dependencies: []): void | PromiseLike<void>
}

export interface EntityCtor<T> {
    new(...args: any[]): T
}

export interface EntityFactory<T> {
    (...args: any[]): T
}

type Entity<T> = (EntityCtor<T> | EntityFactory<T>)

export enum EntityScope {
    SharedInstance,
    Prototype
}

export enum EntityType {
    Constructor,
    Factory
}

type Dependency = (Entity<any> | string)

export interface EntityDescriptor {
    entity: Entity<any>,
    entityType?: EntityType,
    dependencies?: Dependency[],
    entityName?: string,
    shareEntity?: boolean,
    scope?: EntityScope,
    postDependencies?: Dependency[][],
    onFulfilled?: OnFulfilled
}

export class DIContainer {
    private descriptorsProto: Map<Entity<any>, EntityDescriptor> = new Map();
    private descriptorsShared: Map<Entity<any>, EntityDescriptor> = new Map();
    private descriptorsNamed: Map<string, EntityDescriptor> = new Map();

    private namedInstances: Map<string, any> = new Map();
    private sharedInstances: Map<Entity<any>, any> = new Map();
    private pendingPromises: Map<string, TriggeredPromise<any>> = new Map();
    private wishList: Map<Dependency, Set<string>> = new Map();

    public addEntity(descriptor: EntityDescriptor) {
        this.checkAndBeautifyDescriptor(descriptor);
        this.saveDescriptor(descriptor);
        this.checkPending(descriptor);
    }

    public getInstance<T>(entityName: string): TriggeredPromise<T> {
        if (this.pendingPromises.has(entityName)) {
            return this.pendingPromises.get(entityName);
        }
        const promise = new TriggeredPromise<T>();
        const instance = this.tryToResolve(entityName);
        if (instance != null) {
            promise.resolve(instance);
        } else {
            this.pendingPromises.set(entityName, promise);
        }
        return promise;
    }

    private tryToResolve(entityName: string): any {
        if (this.namedInstances.has(entityName)) {
            return this.namedInstances.get(entityName);
        }
        const resolutionRes = this.createResolutionPlan(entityName);
        if (!Array.isArray(resolutionRes)) {
            if (!this.wishList.has(resolutionRes)) {
                this.wishList.set(resolutionRes, new Set());
            }
            this.wishList.get(resolutionRes).add(entityName);
            return null;
        }
        const resolved: Map<Dependency, any> = new Map();
        while (resolutionRes.length != 0) {
            const descriptor = resolutionRes.pop();
            const deps: any[] = [];
            descriptor.dependencies.forEach((dep) => {
                deps.push(resolved.get(dep));
            });
            const instance = this.resolveInstance(descriptor, deps);
            if (descriptor.entityName != null) {
                resolved.set(descriptor.entityName, instance);
                if (descriptor.shareEntity){
                    resolved.set(descriptor.entity, instance);
                }
            } else {
                resolved.set(descriptor.entity, instance);
            }
            if (resolutionRes.length == 0) {
                return instance;
            }
        }
    }

    private resolveInstance<T>(descriptor: EntityDescriptor, dependencies: any[]): T {
        let inst: T = null;
        const instance = (): T => {
            if (inst == null) {
                if(descriptor.entityType == EntityType.Constructor) {
                    inst = new (descriptor.entity as EntityCtor<T>)(...dependencies);
                } else if (descriptor.entityType == EntityType.Factory){
                    inst = (descriptor.entity as EntityFactory<T>)(...dependencies);
                }
            }
            return inst;
        };
        if (descriptor.entityName != null) {
            if (!this.namedInstances.has(descriptor.entityName)) {
                this.namedInstances.set(descriptor.entityName, instance());
            } else {
                inst = this.namedInstances.get(descriptor.entityName)
            }
        }
        if (descriptor.shareEntity && descriptor.scope == EntityScope.SharedInstance) {
            if (!this.sharedInstances.has(descriptor.entity)) {
                this.sharedInstances.set(descriptor.entity, instance());
            } else {
                inst = this.sharedInstances.get(descriptor.entity);
            }
        }
        return instance();
    }


    private checkPending(descriptor: EntityDescriptor) {
        const key = descriptor.entityName == null ? descriptor.entity : descriptor.entityName;
        const waiting = this.wishList.get(key);
        if (waiting != null) {
            waiting.forEach((entityName: string) => {
                const instance = this.tryToResolve(entityName);
                if (instance != null) {
                    const promise = this.pendingPromises.get(entityName);
                    if (promise == null) {
                        throw new Error('DI Container internal state error');
                    }
                    promise.resolve(instance);
                    this.pendingPromises.delete(entityName);
                }
            });
            this.wishList.delete(key);
        }
    }

    private createResolutionPlan(entityId: string): EntityDescriptor[] | Dependency {
        if (!this.descriptorsNamed.has(entityId)) {
            return entityId;
        }
        let currentRoot = this.descriptorsNamed.get(entityId);
        const entityName = currentRoot.entityName;
        const plan: EntityDescriptor[] = [currentRoot];
        const parentRefs: number[] = [null];

        //TODO: optimize containers - check if Set acts better here
        const queue: EntityDescriptor[] = [];
        const queueParentRefs: number[] = [];
        let buildWayUp = (): Map<EntityDescriptor, number> => {
            let result: Map<EntityDescriptor, number> = new Map();
            let parentRef = parentRefs[parentRefs.length - 1];
            while (parentRef != null) {
                result.set(plan[parentRef], parentRef);
                parentRef = parentRefs[parentRef];
            }
            return result;
        };

        while (currentRoot.dependencies.length != 0 || queue.length != 0) {
            let wayUp = buildWayUp();
            for (let i = 0; i < currentRoot.dependencies.length; i++) {
                const dependency = currentRoot.dependencies[i];
                const descriptor = this.getDescriptor(dependency);
                if (descriptor == null) {
                    return dependency;
                }
                if (wayUp.has(descriptor)) {
                    //TODO: error message should contain more details, but entityName doesn't present
                    //      in every descriptor -> unclear how to print descriptors
                    throw new Error('Cyclic dependency detected while resolving dependencies for ' + entityName);
                }
                queue.push(descriptor);
                queueParentRefs.push(plan.length - 1);
            }
            plan.push(queue.shift());
            parentRefs.push(queueParentRefs.shift());
            currentRoot = plan[plan.length - 1];
        }
        return plan;
    }

    private saveDescriptor(descriptor: EntityDescriptor) {
        if (descriptor.entityName != null) {
            this.descriptorsNamed.set(descriptor.entityName, descriptor);
        }
        if (descriptor.shareEntity) {
            if (descriptor.scope == EntityScope.SharedInstance) {
                this.descriptorsShared.set(descriptor.entity, descriptor);
            } else {
                this.descriptorsProto.set(descriptor.entity, descriptor);
            }
        }
    }

    private getDescriptor(dependency: Dependency) {
        if (typeof dependency === 'string') {
            return this.descriptorsNamed.get(dependency);
        } else if (this.descriptorsShared.has(dependency)) {
            return this.descriptorsShared.get(dependency);
        } else {
            return this.descriptorsProto.get(dependency);
        }
    }

    private checkAndBeautifyDescriptor(descriptor: EntityDescriptor) {
        descriptor.scope = descriptor.scope == null ? EntityScope.SharedInstance : descriptor.scope;
        descriptor.dependencies = descriptor.dependencies == null ? [] : descriptor.dependencies;
        //shareEntity: always true for unnamed entities, false by default for named
        descriptor.shareEntity = descriptor.entityName == null ? true : descriptor.shareEntity == null ? false : descriptor.shareEntity;
        descriptor.entityType = descriptor.entityType == null? EntityType.Constructor : descriptor.entityType;
        if (descriptor.entityName == null) {
            if (((descriptor.scope == EntityScope.SharedInstance)
                && (this.descriptorsProto.has(descriptor.entity)))
                ||
                ((descriptor.scope == EntityScope.Prototype)
                    && (this.descriptorsShared.has(descriptor.entity)))) {
                throw new Error('Anonymous singletons (scope == EntityScope.SharedInstance) and entities ' +
                    'with EntityScope.Prototype cannot be used for the same Entity');
            }
        }
    }
}