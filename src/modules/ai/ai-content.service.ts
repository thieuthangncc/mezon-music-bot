import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeSearchService } from '@/modules/song-cache/youtube-search.service';

export interface SongRequestReplyParams {
    trackName: string;
    authorName?: string;
    requestedBy: string;
    queuePosition: number;
    queueTotal: number;
    prevTrackName?: string;
}

export interface SongSuggestion {
    title: string;
    artist: string;
    reason?: string;
    url?: string;
}

export interface SongSuggestionResult {
    isMusicRelated: boolean;
    intro?: string;
    suggestions: SongSuggestion[];
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

    constructor(
        private readonly configService: ConfigService,
        private readonly youtubeSearchService: YoutubeSearchService,
    ) {}

    async generateSongRequestReply(params: SongRequestReplyParams): Promise<string> {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            return this.getFallbackReply(params);
        }

        try {
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

            const content = await this.groqChat({
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
                maxTokens: 120,
                temperature: 1,
            });

            if (!content) {
                return this.getFallbackReply(params);
            }

            return content;
        } catch (error) {
            this.logger.warn('Failed to generate AI song request reply', error);
            return this.getFallbackReply(params);
        }
    }

    async suggestSongs(query: string): Promise<SongSuggestionResult | null> {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            return null;
        }

        try {
            const analysis = await this.analyzeMusicQuery(query);
            if (!analysis?.isMusicRelated || !analysis.searchQueries.length) {
                return { isMusicRelated: false, suggestions: [] };
            }

            const searchResults = await Promise.all(
                analysis.searchQueries.map(async (item) => ({
                    reason: item.reason,
                    hit: await this.youtubeSearchService.searchSong(item.query),
                })),
            );

            const seenVideoIds = new Set<string>();
            const suggestions: SongSuggestion[] = [];

            for (const result of searchResults) {
                const hit = result.hit;
                if (!hit || seenVideoIds.has(hit.videoId)) {
                    continue;
                }

                seenVideoIds.add(hit.videoId);
                suggestions.push({
                    title: hit.title,
                    artist: hit.artist,
                    reason: result.reason,
                    url: hit.url,
                });

                if (suggestions.length >= 5) {
                    break;
                }
            }

            if (!suggestions.length) {
                return { isMusicRelated: false, suggestions: [] };
            }

            return {
                isMusicRelated: true,
                intro: analysis.intro || '🎧 MeEm pick cho bạn mấy bài này nè~',
                suggestions,
            };
        } catch (error) {
            this.logger.warn('Failed to generate song suggestions', error);
            return null;
        }
    }

    private async analyzeMusicQuery(query: string): Promise<{
        isMusicRelated: boolean;
        intro?: string;
        searchQueries: Array<{ query: string; reason?: string }>;
    } | null> {
        const content = await this.groqChat({
            messages: [
                {
                    role: 'system',
                    content: [
                        'Bạn là DJ bot MeEm, chuyên phân tích yêu cầu nhạc cho Gen Z Việt Nam.',
                        'Trả về JSON thuần (không markdown).',
                        'Schema: {"isMusicRelated":boolean,"intro":string,"searchQueries":[{"query":string,"reason":string}]}',
                        'isMusicRelated=false nếu KHÔNG liên quan nhạc/bài hát/nghệ sĩ/vibe/mood âm nhạc.',
                        'isMusicRelated=true nếu user mô tả mood, thể loại, ca sĩ, bài hát, vibe nghe nhạc...',
                        'KHÔNG trả tên bài/nghệ sĩ trực tiếp — chỉ trả searchQueries để tìm trên YouTube.',
                        'Mỗi query là cụm từ tìm kiếm ngắn, gồm tên bài + ca sĩ + "official" hoặc "official audio".',
                        'Ví dụ query: "Sơn Tùng MTP Lạc trôi official", "Adele someone like you official audio".',
                        'Tạo 3-5 searchQueries đa dạng (VN + quốc tế nếu phù hợp).',
                        'intro: 1 câu vui vẻ giới thiệu gợi ý (tối đa 150 ký tự, có emoji).',
                        'reason: 1 câu ngắn vì sao query đó phù hợp với yêu cầu user.',
                        'Khi isMusicRelated=false: searchQueries=[], intro="".',
                    ].join(' '),
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            maxTokens: 500,
            temperature: 0.7,
            jsonMode: true,
        });

        if (!content) {
            return null;
        }

        const parsed = JSON.parse(content) as {
            isMusicRelated?: boolean;
            intro?: string;
            searchQueries?: Array<{ query?: string; reason?: string }>;
        };

        const searchQueries = (parsed.searchQueries ?? [])
            .filter((item) => item.query?.trim())
            .slice(0, 5)
            .map((item) => ({
                query: item.query!.trim(),
                reason: item.reason?.trim(),
            }));

        return {
            isMusicRelated: Boolean(parsed.isMusicRelated),
            intro: parsed.intro?.trim(),
            searchQueries,
        };
    }

    private async groqChat(params: {
        messages: Array<{ role: string; content: string }>;
        maxTokens: number;
        temperature: number;
        jsonMode?: boolean;
    }): Promise<string | null> {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            return null;
        }

        const model = this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

        const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: params.messages,
                max_tokens: params.maxTokens,
                temperature: params.temperature,
                ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.warn(`Groq API error (${response.status}): ${errorText}`);
            return null;
        }

        const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        return data.choices?.[0]?.message?.content?.trim() ?? null;
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
