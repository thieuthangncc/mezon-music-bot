export interface ParsedCommand {
    commandName: string;
    args: string[];
}

export function isTrigger(content: string): boolean {
    const text = content.trim();

    if (!text.startsWith('*')) {
        return false;
    }

    const prefixes = [process.env.COMMAND_PREFIX as string, 'dj'].filter(Boolean);

    return prefixes.some((prefix) => text.startsWith(`*${prefix}`));
}

export function parseCommand(content: string): ParsedCommand {
    const parts = content
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0);
    const commandName = (parts[1] || '').toLowerCase();
    const args = parts.slice(2);

    return {
        commandName,
        args,
    };
}

export function extractFirstUrl(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s<>]+/i);
    return match?.[0] ?? null;
}
