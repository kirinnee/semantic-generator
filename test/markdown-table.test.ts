import {MarkdownTable} from "../src/markdown-table";
import {Kore} from "@kirinnee/core";

const core = new Kore();
core.ExtendPrimitives();
describe("MarkdownTable", function () {
    const mdt = new MarkdownTable(core);

    it("should return markdown table based on input array", function () {
        const subj1 = [
            ["key", "val"],
            ["first", "this is the first line"],
            ["second", "this is the second line"],
            ["third", "this should be a pretty long line"],
        ];

        const ex1 = `| key    | val                               |
| ------ | --------------------------------- |
| first  | this is the first line            |
| second | this is the second line           |
| third  | this should be a pretty long line |`;

        const act1 = mdt.Render(subj1);
        expect(act1.isOk()).toBe(true);
        expect(act1.unwrap()).toBe(ex1);


        const subj2 = [
            ["Parameter", "Description", "Default"],
            ["`replicaCount`", "How many replicas should be deployed", "`1`"],
            ["`image.repository`", "Passbolt image repository", "`\"passbolt/passbolt\"`"],
            ["`image.tag`", "Passbolt image tag", "`\"latest\"`"],
            ["`image.pullPolicy`", "Image pull policy", "`IfNotPresent`"],
            ["`imagePullSecrets`", "Image pull secrets", "`[]`"],
            ["`nameOverride`", "Name override", "`\"\"`"],
            ["`fullnameOverride`", "Full name override", "`\"\"`"],
            ["`service.type`", "Service type", "`ClusterIP`"],
            ["`service.port`", "Service port", "`80`"],
            ["`ingress.enabled`", "Enable ingress", "`true`"],
            ["`ingress.host`", "Ingress host", "`passbolt.yourdomain.com`"],
        ];

        const ex2 = `| Parameter          | Description                          | Default                   |
| ------------------ | ------------------------------------ | ------------------------- |
| \`replicaCount\`     | How many replicas should be deployed | \`1\`                       |
| \`image.repository\` | Passbolt image repository            | \`"passbolt/passbolt"\`     |
| \`image.tag\`        | Passbolt image tag                   | \`"latest"\`                |
| \`image.pullPolicy\` | Image pull policy                    | \`IfNotPresent\`            |
| \`imagePullSecrets\` | Image pull secrets                   | \`[]\`                      |
| \`nameOverride\`     | Name override                        | \`""\`                      |
| \`fullnameOverride\` | Full name override                   | \`""\`                      |
| \`service.type\`     | Service type                         | \`ClusterIP\`               |
| \`service.port\`     | Service port                         | \`80\`                      |
| \`ingress.enabled\`  | Enable ingress                       | \`true\`                    |
| \`ingress.host\`     | Ingress host                         | \`passbolt.yourdomain.com\` |`;

        const act2 = mdt.Render(subj2);
        expect(act2.isOk()).toBe(true);
        expect(act2.unwrap()).toBe(ex2);

        const subj3 = [
            ["name", "age", "weight", "height"],
            ["Sheryl", "22", "62.3", "161.2"],
            ["Zhang", "24", "71.5", "177.3"],
        ];

        const ex3 = `| name   | age | weight | height |
| ------ | --- | ------ | ------ |
| Sheryl | 22  | 62.3   | 161.2  |
| Zhang  | 24  | 71.5   | 177.3  |`;

        const act3 = mdt.Render(subj3);
        expect(act3.isOk()).toBe(true);
        expect(act3.unwrap()).toBe(ex3);
    });

    it("should return error if it only has 1 row (headers)", function () {
        const subj1: string[][] = [];
        const subj2 = [["key", "val"]];
        const subj3 = [["name", "age", "weight", "height"]];

        const act1 = mdt.Render(subj1);
        const act2 = mdt.Render(subj2);
        const act3 = mdt.Render(subj3);

        expect(act1.isErr()).toBe(true);
        expect(act1.unwrapErr()).toBe("Need at least 2 rows");
        expect(act2.isErr()).toBe(true);
        expect(act2.unwrapErr()).toBe("Need at least 2 rows");
        expect(act3.isErr()).toBe(true);
        expect(act3.unwrapErr()).toBe("Need at least 2 rows");
    });

    it("should return error if it does not make a complete matrix", function () {
        const subj1 = [
            ["key", "val"],
            ["first", "this is the first line"],
            ["second"],
            ["third", "this should be a pretty long line"],
        ];

        const subj2 = [
            ["Parameter", "Description", "Default"],
            ["`replicaCount`", "How many replicas should be deployed", "`1`", "8"],
            ["`image.repository`", "Passbolt image repository", "`\"passbolt/passbolt\"`"],
            ["`image.tag`", "Passbolt image tag", "`\"latest\"`"],
            ["`image.pullPolicy`", "Image pull policy", "`IfNotPresent`"],
            ["`imagePullSecrets`", "Image pull secrets", "`[]`"],
            ["`nameOverride`", "Name override", "`\"\"`"],
            ["`fullnameOverride`", "Full name override", "`\"\"`"],
            ["`service.type`", "Service type", "`ClusterIP`"],
            ["`service.port`", "Service port", "`80`"],
            ["`ingress.enabled`", "Enable ingress", "`true`"],
            ["`ingress.host`", "Ingress host", "`passbolt.yourdomain.com`"],
        ];

        const subj3 = [
            ["name", "age", "weight"],
            ["Sheryl", "22", "62.3", "161.2"],
            ["Zhang", "24", "71.5", "177.3"],
        ];

        const act1 = mdt.Render(subj1);
        const act2 = mdt.Render(subj2);
        const act3 = mdt.Render(subj3);

        expect(act1.isErr()).toBe(true);
        expect(act1.unwrapErr()).toBe("Not a complete matrix");
        expect(act2.isErr()).toBe(true);
        expect(act2.unwrapErr()).toBe("Not a complete matrix");
        expect(act3.isErr()).toBe(true);
        expect(act3.unwrapErr()).toBe("Not a complete matrix");
    });
});
