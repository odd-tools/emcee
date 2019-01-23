const userIdPrefix = 'u_';
const autoIdPrefix = 'a_';

export class IdGen {
    private nextIdNum: 0;

    public id(customId?: string): string {
        if (customId != null) {
            return userIdPrefix + customId;
        } else {
            return autoIdPrefix + this.nextIdNum++;
        }
    }

}