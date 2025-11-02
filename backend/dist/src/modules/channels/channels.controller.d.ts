import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
export declare class ChannelsController {
    private readonly channelsService;
    constructor(channelsService: ChannelsService);
    findAll(): Promise<import("../../entities/channel.entity").Channel[]>;
    findActive(): Promise<import("../../entities/channel.entity").Channel[]>;
    findOne(id: string): Promise<import("../../entities/channel.entity").Channel>;
    create(dto: CreateChannelDto): Promise<import("../../entities/channel.entity").Channel>;
    update(id: string, dto: UpdateChannelDto): Promise<import("../../entities/channel.entity").Channel>;
    remove(id: string): Promise<void>;
    toggleActive(id: string): Promise<import("../../entities/channel.entity").Channel>;
    reorder(body: {
        ids: string[];
    }): Promise<void>;
}
