---
name: create-command
description: Creates a new bot command following the project's established pattern. Run this when the user asks to add a new command (e.g. "add command xxx", "create command yyy", "make a new command").
---

# Create Bot Command

Creates a new `*dj <command>` for this Mezon music bot.

## Steps

### 1. Define the command name and args

Ask the user for:
- **Command name** (e.g. `skip`, `queue`, `pause`, `volume`)
- **Arguments** expected (if any)
- **What the command should do**

### 2. Create directory and file

Path: `src/bot/commands/<name>/<name>.command.ts`

Use this exact template:

```ts
import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class XxxCommand implements BotCommand {
    name = 'xxx';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage, args } = ctx;

        try {
            // --- BUSINESS LOGIC HERE ---
            // Use args[0], args[1], etc. for arguments
            // Use event.sender_id, event.clan_id, event.display_name, etc.
            // Use this.mcService.updateMessage(repliedMessage, getTextMessage('...'))
            //   to send the final response
            // Use this.mcService.replyMessage(channelId, messageId, content)
            //   to send a new message
            // --- END BUSINESS LOGIC ---
        } catch (error) {
            console.error(`❌ Lỗi khi thực hiện lệnh \`xxx\`:`, error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
```

### 3. Inject additional services if needed

Available services (check their files for available methods):

| Service | Import path | Purpose |
|---|---|---|
| `MezonClientService` | `@/libs/mezon-client/mezon-client.service` | Send/update/reply messages, fetch channels |
| `MiscService` | `@/modules/misc/misc.service` | `sendLoadingMessage()`, `handleCommandError()` |
| `StreamingService` | `@/modules/streaming/streaming.service` | `playStreaming()`, `stopStreaming()` |
| `PrismaService` | `@/libs/prisma/prisma.service` | Database access (User, Clan, Playlist, PlaylistSong) |

### 4. Register the command

**Edit `src/bot/commands/command.service.ts`:**
- Import the new command class
- Add it to the constructor parameters
- Call `this.register(...)` in the constructor body

**Edit `src/bot/commands/command.module.ts`:**
- Import the new command class
- Add it to the `providers` array

### 5. Verify

Run `npm run build` or `yarn build` to check for TypeScript errors.
