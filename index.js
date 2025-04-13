const { Telegraf, Markup } = require('telegraf');
const express = require('express'); // Add Express
require('dotenv').config();

const app = express(); // Create Express app
const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_USERNAME: process.env.CHANNEL_USERNAME,
    CHANNEL_ID: process.env.CHANNEL_ID,
    WEBAPP_URL: process.env.WEBAPP_URL || 'https://celebrated-monstera-5f9fb5.netlify.app/',
    PORT: process.env.PORT || 3000 // Add port configuration
};

const bot = new Telegraf(config.BOT_TOKEN);

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

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
    } catch (error) {
        console.error('Start xatosi:', error);
        ctx.reply('⚠️ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
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
        ctx.answerCbQuery('⚠️ Tekshirishda xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.');
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot xatosi:', err);
    ctx.reply('⚠️ Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
});

// Start the server and bot
app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    bot.launch()
        .then(() => console.log(`🤖 Bot @${bot.context.botInfo.username} sifatida ishga tushdi`))
        .catch(err => console.error('Ishga tushirishda xatolik:', err));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));