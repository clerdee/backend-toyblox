const db = require('../config/database');
const transporter = require('../config/mailer');

async function sendOrderConfirmation(userId, orderId) {
  const [userRows] = await db.promise().execute(
    `SELECT f_name, l_name, email FROM users WHERE id = ?`,
    [userId]
  );
  const user = userRows[0];

  const mailOptions = {
    from: '"ToyBlox" <no-reply@toyblox.com>',
    to: user.email,
    subject: `🧸 Your ToyBlox Order #${orderId} Confirmation`,
    html: `
      <h2>Thank you, ${user.f_name}!</h2>
      <p>Your order <strong>#${orderId}</strong> has been successfully placed.</p>
      <p>We will notify you once it's shipped.</p>
      <p style="margin-top: 20px;">💛 ToyBlox Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Export the function so it can be used in other files
module.exports = { sendOrderConfirmation };
