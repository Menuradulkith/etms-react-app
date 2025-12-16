const nodemailer = require('nodemailer');

// Create transporter - Configure with your SMTP settings
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// Send welcome email to new user
const sendWelcomeEmail = async (userDetails) => {
  const { email, name, username, password, role } = userDetails;
  
  if (!email) {
    console.log('No email provided, skipping welcome email');
    return { success: false, message: 'No email provided' };
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP not configured, skipping email. User details:', { username, password, role });
    return { success: false, message: 'SMTP not configured' };
  }

  const transporter = createTransporter();
  const welcomePageUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const mailOptions = {
    from: `"Harischandra Mills ETMS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to Harischandra Mills ETMS - Your Account Details',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1a3a4a 0%, #2d5a6b 50%, #1a6969 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #f7cf31;
            margin: 10px 0 0;
            font-size: 16px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
          }
          .credentials-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #1a6969;
          }
          .credentials-box h3 {
            color: #1a3a4a;
            margin: 0 0 15px;
            font-size: 18px;
          }
          .credential-item {
            margin: 12px 0;
            font-size: 15px;
          }
          .credential-label {
            color: #666;
            display: inline-block;
            width: 100px;
          }
          .credential-value {
            color: #1a6969;
            font-weight: bold;
          }
          .important-note {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .important-note strong {
            display: block;
            margin-bottom: 5px;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #f7cf31 0%, #e6b800 100%);
            color: #1a3a4a;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: #666;
            font-size: 13px;
          }
          .footer a {
            color: #1a6969;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Harischandra Mills</h1>
            <p>Employee Task Management System</p>
          </div>
          <div class="content">
            <p class="greeting">Dear ${name || 'User'},</p>
            <p>Welcome to the Harischandra Mills Employee Task Management System! Your account has been successfully created.</p>
            
            <div class="credentials-box">
              <h3>Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Username:</span>
                <span class="credential-value">${username}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Role:</span>
                <span class="credential-value">${role}</span>
              </div>
            </div>

            <div class="important-note">
              <strong>⚠️ Important Security Notice</strong>
              For your security, you will be required to change your password upon your first login.
            </div>

            <p style="text-align: center;">
              <a href="${welcomePageUrl}" class="btn">Login to ETMS</a>
            </p>

            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            
            <p>Best regards,<br>Harischandra Mills IT Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Harischandra Mills ETMS.</p>
            <p>Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Harischandra Mills. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendWelcomeEmail
};
