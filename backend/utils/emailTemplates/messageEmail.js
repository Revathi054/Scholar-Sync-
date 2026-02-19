const messageEmailTemplate = ({
  receiverName,
  senderName,
  messagePreview,
}) => {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; background:#f4f6f8;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">

          <table width="600" style="background:#ffffff; margin:20px; border-radius:8px;">
            <tr>
              <td style="background:#4f46e5; color:white; padding:16px; text-align:center;">
                <h2 style="margin:0;">SkillSwap</h2>
              </td>
            </tr>

            <tr>
              <td style="padding:20px; color:#333;">
                <h3>📩 New Message</h3>

                <p>Hello <b>${receiverName}</b>,</p>

                <p>You received a message from <b>${senderName}</b>:</p>

                <div style="background:#f1f5f9; padding:12px; border-radius:6px;">
                  "${messagePreview}"
                </div>

                <p style="margin-top:16px;">
                  Login to SkillSwap to reply.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb; text-align:center; padding:10px; font-size:12px; color:#777;">
                © SkillSwap • Learn Together
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

module.exports = messageEmailTemplate;
