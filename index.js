const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
require('dotenv').config();

const app = express();
const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_USERNAME: process.env.CHANNEL_USERNAME,
    CHANNEL_ID: process.env.CHANNEL_ID,
    WEBAPP_URL: process.env.WEBAPP_URL || 'https://celebrated-monstera-5f9fb5.netlify.app/',
    ADMIN_USERNAME: 'Izzat_T', // Without @
    PORT: process.env.PORT || 3000
};

const bot = new Telegraf(config.BOT_TOKEN);
const activeUsers = new Set(); // Tracks active users

// Initialize session middleware
bot.use(session({
    defaultSession: () => ({})
}));

// Middleware to track active users
bot.use((ctx, next) => {
    if (ctx.from) activeUsers.add(ctx.from.id);
    return next();
});

// Check admin status
function isAdmin(ctx) {
    return ctx.from?.username === config.ADMIN_USERNAME;
}

// Check subscription status
async function isUserSubscribed(userId) {
    try {
        const member = await bot.telegram.getChatMember(config.CHANNEL_ID, userId);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (error) {
        console.error('Obuna tekshirishda xatolik:', error);
        return false;
    }
}

// Start command handler
bot.start(async (ctx) => {
    try {
        if (isAdmin(ctx)) {
            await ctx.reply(
                '👨‍💻 Admin Panel',
                Markup.keyboard([
                    ['👥 Show Users', '📨 Send Post'],
                    ['🔄 Refresh Stats']
                ]).resize().oneTime()
            );
        } else {
            const isSubscribed = await isUserSubscribed(ctx.from.id);
            if (isSubscribed) {
                await ctx.replyWithHTML(
                    `🎉 <b>Xush kelibsiz, ${ctx.from.first_name}!</b>\n\n` +
                    `Botimizdan foydalanish uchun login va parolni @RevizorCDR oling`,
                    Markup.inlineKeyboard([
                        [Markup.button.webApp('🌐 Veb ilovani ochish', config.WEBAPP_URL)]
                    ])
                );
            } else {
                await ctx.replyWithHTML(
                    `👋 <b>Xush kelibsiz, ${ctx.from.first_name}!</b>\n\n` +
                    `Bizning xizmatlardan foydalanish uchun quyidagi kanalga obuna bo'ling:\n` +
                    `<b>${config.CHANNEL_USERNAME}</b>`,
                    Markup.inlineKeyboard([
                        [Markup.button.url('📢 Kanalga qo\'shilish', `https://t.me/${config.CHANNEL_USERNAME.substring(1)}`)],
                        [Markup.button.callback('✅ Obuna bo\'ldim', 'verify_subscription')]
                    ])
                );
            }
        }
    } catch (error) {
        console.error('Start xatosi:', error);
        await ctx.reply('⚠️ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
});

// Subscription verification handler
bot.action('verify_subscription', async (ctx) => {
    try {
        await ctx.answerCbQuery('🔍 Obuna tekshirilmoqda...');
        const isSubscribed = await isUserSubscribed(ctx.from.id);

        if (isSubscribed) {
            await ctx.editMessageText(
                `🎉 <b>Tekshirish muvaffaqiyatli!</b>\n\n` +
                `Bot ishlashi uchun login va parol ni @RevizorCDR dan oling`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.webApp('🌐 Veb ilovani ochish', config.WEBAPP_URL)]
                    ])
                }
            );
        } else {
            await ctx.editMessageText(
                `❌ <b>Obuna topilmadi</b>\n\n` +
                `Iltimos, avval bizning kanalga qo'shiling: ${config.CHANNEL_USERNAME}`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('📢 Kanalga qo\'shilish', `https://t.me/${config.CHANNEL_USERNAME.substring(1)}`)],
                        [Markup.button.callback('🔄 Qayta tekshirish', 'verify_subscription')]
                    ])
                }
            );
        }
    } catch (error) {
        console.error('Tekshirish xatosi:', error);
        await ctx.answerCbQuery('⚠️ Tekshirishda xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.');
    }
});

// Admin: Show users
bot.hears('👥 Show Users', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.reply(`Active users: ${activeUsers.size}\nUser IDs:\n${Array.from(activeUsers).join('\n')}`);
});

// Admin: Send post
bot.hears('📨 Send Post', async (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.waitingForPost = true;
    await ctx.reply('Send me the post content (text/photo/video):');
});

// Admin: Handle broadcasts
bot.on(['text', 'photo', 'video'], async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.waitingForPost) return;

    delete ctx.session.waitingForPost;
    let successCount = 0;

    for (const userId of activeUsers) {
        try {
            if (ctx.message.photo) {
                await ctx.telegram.sendPhoto(
                    userId,
                    ctx.message.photo[0].file_id,
                    { caption: ctx.message.caption || '' }
                );
            } else if (ctx.message.video) {
                await ctx.telegram.sendVideo(
                    userId,
                    ctx.message.video.file_id,
                    { caption: ctx.message.caption || '' }
                );
            } else {
                await ctx.telegram.sendMessage(userId, ctx.message.text);
            }
            successCount++;
        } catch (err) {
            console.error(`Failed to send to ${userId}:`, err);
            activeUsers.delete(userId);
        }
    }

    await ctx.reply(`✅ Sent to ${successCount}/${activeUsers.size} users`);
});

// Admin: Refresh stats (placeholder, as original code had it but no logic)
bot.hears('🔄 Refresh Stats', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.reply(`📊 Current active users: ${activeUsers.size}`);
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot xatosi:', err);
    ctx.reply('⚠️ Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
});

// Health check endpoint
app.get('/', (req, res) => res.send('Bot is running!'));

// Start the server and bot
app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    bot.launch()
        .then(() => console.log(`🤖 Bot @${bot.botInfo?.username || 'unknown'} sifatida ishga tushdi`))
        .catch(err => console.error('Ishga tushirishda xatolik:', err));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));