const requestStatusEmailTemplate = ({
  senderName,
  status,
}) => {
  const statusColor = status === "accepted" ? "#16a34a" : "#dc2626";

  return `
<!DOCTYPE html>
<html>
  <body style="font-family:Arial; background:#f4f6f8; padding:20px;">
    <div style="max-width:600px; background:#fff; margin:auto; border-radius:8px;">

      <div style="background:${statusColor}; color:white; padding:16px; text-align:center;">
        <h2>Request ${status.toUpperCase()}</h2>
      </div>

      <div style="padding:20px; color:#333;">
        <p>Hello <b>${senderName}</b>,</p>

        <p>Your study request has been 
          <b style="color:${statusColor};">${status}</b>.
        </p>

        <p>You can login to SkillSwap for further details.</p>
      </div>

      <div style="background:#f9fafb; text-align:center; padding:10px; font-size:12px;">
        © SkillSwap
      </div>

    </div>
  </body>
</html>
`;
};

module.exports = requestStatusEmailTemplate;
