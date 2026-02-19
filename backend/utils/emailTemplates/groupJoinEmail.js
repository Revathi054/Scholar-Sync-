const groupJoinEmailTemplate = ({
  userName,
  groupName,
}) => {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family:Arial, sans-serif; background:#f4f6f8; padding:20px;">
    <div style="max-width:600px; background:#ffffff; margin:auto; border-radius:8px;">
      
      <div style="background:#16a34a; color:white; padding:16px; text-align:center;">
        <h2>🎓 Study Group Joined</h2>
      </div>

      <div style="padding:20px; color:#333;">
        <p>Hello <b>${userName}</b>,</p>

        <p>You have successfully joined the study group:</p>

        <h3 style="color:#16a34a;">${groupName}</h3>

        <p>Start collaborating and learning together 🚀</p>
      </div>

      <div style="background:#f9fafb; text-align:center; padding:10px; font-size:12px;">
        © SkillSwap
      </div>

    </div>
  </body>
</html>
`;
};

module.exports = groupJoinEmailTemplate;
