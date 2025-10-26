"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateButtonDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_button_dto_1 = require("./create-button.dto");
class UpdateButtonDto extends (0, swagger_1.PartialType)(create_button_dto_1.CreateButtonDto) {
}
exports.UpdateButtonDto = UpdateButtonDto;
//# sourceMappingURL=update-button.dto.js.map