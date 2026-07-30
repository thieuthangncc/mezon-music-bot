import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SongRequestReplyParams {
    trackName: string;
    authorName?: string;
    requestedBy: string;
    queuePosition: number;
    queueTotal: number;
    prevTrackName?: string;
}

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

const REPLY_STYLES = [
    'hype như MC sân khấu, năng lượng cao',
    'dễ thương kiểu bestie thân thiết',
    'meme Gen Z, hài hước nhẹ nhàng',
    'DJ club, cool và tự tin',
    'dramatic nhẹ, phản ứng over một chút cho vui',
    'chill vibe, thư thái nhưng vẫn vui',
] as const;

@Injectable()
export class AiContentService {
    private readonly logger = new Logger(AiContentService.name);

    constructor(private readonly configService: ConfigService) {}

    async generateSongRequestReply(params: SongRequestReplyParams): Promise<string> {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            return this.getFallbackReply(params);
        }

        try {
            const model = this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';
            const style = REPLY_STYLES[Math.floor(Math.random() * REPLY_STYLES.length)]!;
            const artistPart = params.authorName ? ` — ${params.authorName}` : '';
            const queueHint =
                params.queuePosition === 1
                    ? 'Đây là bài đầu tiên trong hàng đợi, sắp được phát luôn!'
                    : params.queuePosition === params.queueTotal
                      ? `Đang xếp cuối hàng (#${params.queuePosition}/${params.queueTotal}).`
                      : `Đang ở vị trí #${params.queuePosition} trong ${params.queueTotal} bài.`;
            const prevHint = params.prevTrackName
                ? `Bài trước đó: "${params.prevTrackName}".`
                : '';

            const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: [
                                'Bạn là DJ bot MeEm — linh hồn của party, nói chuyện Gen Z Việt Nam.',
                                'Viết 1-2 câu ngắn gọn, SINH ĐỘNG, có năng lượng (tối đa 180 ký tự).',
                                'Dùng 2-4 emoji phù hợp, xen slang tự nhiên (oke, slay, vibe, cháy, flex...).',
                                'Nhắc tên người request và tên bài hát cho cá nhân hóa.',
                                'Phản ứng theo vị trí hàng đợi: bài đầu thì hype "sắp lên sóng", cuối hàng thì động viên kiên nhẫn.',
                                'Không hashtag, không dấu ngoặc kép bọc cả câu, không giải thích thêm.',
                                `Phong cách lần này: ${style}.`,
                            ].join(' '),
                        },
                        {
                            role: 'user',
                            content: [
                                `${params.requestedBy} vừa order "${params.trackName}"${artistPart}.`,
                                queueHint,
                                prevHint,
                            ]
                                .filter(Boolean)
                                .join(' '),
                        },
                    ],
                    max_tokens: 120,
                    temperature: 1,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn(`Groq API error (${response.status}): ${errorText}`);
                return this.getFallbackReply(params);
            }

            const data = (await response.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };
            const content = data.choices?.[0]?.message?.content?.trim();

            if (!content) {
                return this.getFallbackReply(params);
            }

            return content;
        } catch (error) {
            this.logger.warn('Failed to generate AI song request reply', error);
            return this.getFallbackReply(params);
        }
    }

    private getFallbackReply(params: SongRequestReplyParams): string {
        const artistPart = params.authorName ? ` — ${params.authorName}` : '';
        const { requestedBy, trackName, queuePosition, queueTotal } = params;

        if (queuePosition === 1) {
            const firstInQueue = [
                `🚀 ${requestedBy} mở màn luôn! "${trackName}"${artistPart} lên đầu queue — sắp cháy phòng rồi 🔥`,
                `⚡ Oke ${requestedBy}! "${trackName}"${artistPart} ngồi ghế #1, DJ MeEm chuẩn bị bật nhạc nè 🎧✨`,
                `🎤 Vibe check passed! ${requestedBy} chọn "${trackName}"${artistPart} — bài đầu tiên, không phải chờ đâu~ 🌸`,
            ];
            return firstInQueue[Math.floor(Math.random() * firstInQueue.length)]!;
        }

        if (queuePosition === queueTotal && queueTotal > 3) {
            const longQueue = [
                `😮‍💨 "${trackName}"${artistPart} xếp hàng #${queuePosition}/${queueTotal} rồi ${requestedBy} ơi — kiên nhẫn xíu, cháy là có thưởng! 🔥`,
                `🫡 ${requestedBy} order "${trackName}"${artistPart} — hàng dài quá (${queueTotal} bài) nhưng gu thì slay 💅🎶`,
                `⏳ Queue đang đông (${queueTotal} bài)! "${trackName}"${artistPart} của ${requestedBy} đã vào danh sách, chill đi~ ☕✨`,
            ];
            return longQueue[Math.floor(Math.random() * longQueue.length)]!;
        }

        const fallbacks = [
            `🎶 ${requestedBy} flex gu cực mạnh! "${trackName}"${artistPart} vào queue #${queuePosition} — vibe on! ✨`,
            `🔥 Oke luôn ${requestedBy}! "${trackName}"${artistPart} đã book chỗ #${queuePosition}/${queueTotal} rồi nha~ 🎧`,
            `💃 "${trackName}"${artistPart}? ${requestedBy} biết chọn bài đấy! Chờ xíu là tới lượt #${queuePosition} thôi 🌸`,
            `✨ DJ MeEm ghi nhận! ${requestedBy} gửi "${trackName}"${artistPart} — hàng đợi ${queueTotal} bài, bạn ở #${queuePosition} 🎵`,
            `🫶 ${requestedBy} thả "${trackName}"${artistPart} vào queue — #${queuePosition} trong ${queueTotal} bài, party tiếp tục! 🎉`,
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)]!;
    }
}
