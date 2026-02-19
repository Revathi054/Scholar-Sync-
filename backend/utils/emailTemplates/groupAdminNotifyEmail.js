const groupAdminNotifyEmailTemplate = ({
  adminName,
  memberName,
  groupName,
}) => {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; background:#f4f6f8;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">

          <table width="600" style="background:#ffffff; margin:20px; border-radius:8px; overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td style="background:#0ea5e9; color:white; padding:16px; text-align:center;">
                <h2 style="margin:0;">SkillSwap</h2>
                <p style="margin:4px 0 0;">Group Update</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:20px; color:#333;">
                <h3>👤 New Member Joined</h3>

                <p>Hello <b>${adminName}</b>,</p>

                <p>
                  <b>${memberName}</b> has joined your study group:
                </p>

                <div style="background:#f1f5f9; padding:12px; border-radius:6px; margin:12px 0;">
                  <b>${groupName}</b>
                </div>

                <p>
                  You can welcome the new member and guide them to get started.
                </p>
              </td>
            </tr>

            <!-- Footer -->
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

module.exports = groupAdminNotifyEmailTemplate;
