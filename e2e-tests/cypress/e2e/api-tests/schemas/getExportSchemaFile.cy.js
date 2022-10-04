import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schema", () => {
    const authorization = Cypress.env("authorization");

    it("return schema files", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.Schemas, {
            authorization,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let schemaId = response.body[0].id;

            cy.request({
                method: METHOD.GET,
                url: Cypress.env("api_server") + API.Schemas + schemaId + "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.not.be.oneOf([null, ""]);
                let schema = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/exportedSchema.schema",
                    schema,
                    "binary"
                );
            });
        });
    });
});
