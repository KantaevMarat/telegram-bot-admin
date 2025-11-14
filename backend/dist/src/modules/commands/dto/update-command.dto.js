"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommandDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_command_dto_1 = require("./create-command.dto");
class UpdateCommandDto extends (0, swagger_1.PartialType)(create_command_dto_1.CreateCommandDto) {
}
exports.UpdateCommandDto = UpdateCommandDto;
//# sourceMappingURL=update-command.dto.js.map