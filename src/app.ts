import {IdGen} from "./id-gen";

export class App {
    public static createIdGen(): IdGen {
        return new IdGen();
    }
}