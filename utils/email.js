const db = require('../config/database');
const transporter = require('../config/mailer');
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');

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

  return transporter.sendMail(mailOptions);
}

async function sendOrderShippedEmail(orderId) {
  // Get order details
  const [orderRows] = await db.promise().execute(
    `SELECT o.*, c.user_id FROM orderinfo o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?`,
    [orderId]
  );
  
  if (orderRows.length === 0) return;
  
  const order = orderRows[0];
  
  // Get user details
  const [userRows] = await db.promise().execute(
    `SELECT f_name, l_name, email FROM users WHERE id = ?`,
    [order.user_id]
  );
  
  if (userRows.length === 0) return;
  
  const user = userRows[0];

  const mailOptions = {
    from: '"ToyBlox" <no-reply@toyblox.com>',
    to: user.email,
    subject: `🚚 Your ToyBlox Order #${orderId} Has Been Shipped`,
    html: `
      <h2>Good news, ${user.f_name}!</h2>
      <p>Your order <strong>#${orderId}</strong> has been shipped.</p>
      <p>You should receive it within 3-5 business days.</p>
      <p style="margin-top: 20px;">💛 ToyBlox Team</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

async function sendOrderDeliveredEmail(orderId) {
  try {
    // Get order details with customer and user info
    const [orderRows] = await db.promise().execute(`
      SELECT o.*, c.address, c.postal_code, c.country, c.phone_number,
             u.id as user_id, u.f_name, u.l_name, u.email
      FROM orderinfo o
      JOIN customers c ON o.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);
    
    if (orderRows.length === 0) return;
    
    const order = orderRows[0];
    
    // Get order items
    const [itemRows] = await db.promise().execute(`
      SELECT ol.*, i.description
      FROM orderline ol
      JOIN item i ON ol.item_id = i.item_id
      WHERE ol.order_id = ?
    `, [orderId]);
    
    // Calculate totals
    const subtotal = itemRows.reduce((sum, item) => sum + (item.quantity * item.price_at_order), 0);
    const shipping = 50; // Fixed shipping cost
    const tax = subtotal * 0.12;
    const total = subtotal + shipping + tax;
    
    // Generate HTML for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order #${orderId} Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .order-info, .customer-info {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .totals {
            margin-top: 20px;
            text-align: right;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ToyBlox</h1>
            <h2>Order Receipt</h2>
          </div>
          
          <div class="order-info">
            <h3>Order Information</h3>
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Date Placed:</strong> ${new Date(order.date_placed).toLocaleDateString()}</p>
            <p><strong>Date Delivered:</strong> ${new Date(order.date_delivered).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          
          <div class="customer-info">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${order.f_name} ${order.l_name}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Phone:</strong> ${order.phone_number || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.address}, ${order.postal_code}, ${order.country}</p>
          </div>
          
          <h3>Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
<td>$${parseFloat(item.price_at_order || 0).toFixed(2)}</td>
<td>$${(item.quantity * parseFloat(item.price_at_order || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
            <p><strong>Shipping:</strong> $${shipping.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${tax.toFixed(2)}</p>
            <p><strong>Total:</strong> $${total.toFixed(2)}</p>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with ToyBlox!</p>
            <p>If you have any questions about your order, please contact us at support@toyblox.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Ensure the temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // PDF file path
    const pdfFilePath = path.join(tempDir, `order-${orderId}.pdf`);
    
    // Generate PDF
    await new Promise((resolve, reject) => {
      pdf.create(htmlContent, { format: 'Letter' }).toFile(pdfFilePath, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    
    // Send email with PDF attachment
    const mailOptions = {
      from: '"ToyBlox" <no-reply@toyblox.com>',
      to: order.email,
      subject: `🎉 Your ToyBlox Order #${orderId} Has Been Delivered`,
      html: `
        <h2>Great news, ${order.f_name}!</h2>
        <p>Your order <strong>#${orderId}</strong> has been delivered.</p>
        <p>Please find attached your order receipt.</p>
        <p>We hope you enjoy your toys!</p>
        <p style="margin-top: 20px;">💛 ToyBlox Team</p>
      `,
      attachments: [
        {
          filename: `ToyBlox-Order-${orderId}.pdf`,
          path: pdfFilePath
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
    
    // Clean up the temporary file
    fs.unlinkSync(pdfFilePath);
    
    return true;
  } catch (error) {
    console.error('Error sending delivered order email:', error);
    return false;
  }
}

module.exports = {
  sendOrderConfirmation,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail
};
