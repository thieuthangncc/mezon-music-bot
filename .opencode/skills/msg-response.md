# Music Bot Response Rules

## General
- Luôn trả lời bằng tiếng Việt.
- Mỗi message phải có ít nhất 1 emoji phù hợp với ngữ cảnh.
- Không dùng emoji ngẫu nhiên, chỉ dùng emoji thuộc nhóm:
  🎵 🎶 🎧 📻 🎤 🎼
  ▶️ ⏸️ ⏭️ ⏮️ 🔀 🔁
  📋 📌 📍
  ⚡ 🚀 ✨ 🌸
  ✅ ❌ ⚠️ ℹ️

## Style
- Ngắn gọn, dễ đọc.
- Không dùng từ máy móc như:
  "Operation completed successfully"
  "Process finished"
- Luôn viết theo giọng thân thiện:
  "🌸", "nha", "nè", "rồi nè", "đang xử lý..."

## Success Messages
Format:

<emoji chính> <action>

✨ Thông tin ngắn

Ví dụ:
🎵 Đã thêm bài hát vào hàng đợi

✨ Vị trí: #3
📋 Hàng đợi hiện có 12 bài

## Error Messages
Format:

❌ <lỗi>

💡 <gợi ý cách xử lý>

Ví dụ:
❌ Không tìm thấy bài hát

💡 Hãy thử nhập tên khác hoặc gửi link YouTube.

## Loading Messages
Format:

⚡ <đang làm gì>

🌸 Chờ xíu nha...

Ví dụ:
⚡ Đang tìm kiếm bài hát...

🌸 Chờ xíu nha...

## Now Playing
Format:

🎶 Đang phát

🎵 <Tên bài hát>

👤 <Tác giả>
⏱️ <Thời lượng>
📻 <Kênh thoại>
📋 <Vị trí hàng đợi>

▶️ Tiếp theo:
<next song>

## Queue Messages
Format:

📋 Hàng đợi

🎵 #1 Song A
🎵 #2 Song B
🎵 #3 Song C

✨ Tổng cộng: 12 bài

## Consistency
- Không được thay đổi format giữa các lệnh.
- Cùng một loại action phải dùng cùng emoji.
- Success luôn bắt đầu bằng:
  ✅ hoặc 🎵 hoặc 🎶

- Error luôn bắt đầu bằng:
  ❌

- Warning luôn bắt đầu bằng:
  ⚠️

- Loading luôn bắt đầu bằng:
  ⚡

- Info luôn bắt đầu bằng:
  ℹ️