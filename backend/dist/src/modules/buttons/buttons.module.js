"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const buttons_service_1 = require("./buttons.service");
const buttons_controller_1 = require("./buttons.controller");
const button_entity_1 = require("../../entities/button.entity");
let ButtonsModule = class ButtonsModule {
};
exports.ButtonsModule = ButtonsModule;
exports.ButtonsModule = ButtonsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([button_entity_1.Button])],
        controllers: [buttons_controller_1.ButtonsController],
        providers: [buttons_service_1.ButtonsService],
        exports: [buttons_service_1.ButtonsService],
    })
], ButtonsModule);
//# sourceMappingURL=buttons.module.js.map