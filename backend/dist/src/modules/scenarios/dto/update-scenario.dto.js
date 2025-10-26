"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateScenarioDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_scenario_dto_1 = require("./create-scenario.dto");
class UpdateScenarioDto extends (0, swagger_1.PartialType)(create_scenario_dto_1.CreateScenarioDto) {
}
exports.UpdateScenarioDto = UpdateScenarioDto;
//# sourceMappingURL=update-scenario.dto.js.map