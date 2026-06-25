function calculateProfileCompleteness({ user, profile }) {
  const checkpoints = [
    Boolean(user?.fullName),
    Boolean(user?.email),
    Boolean(user?.phone),
    Boolean(profile?.region),
    Boolean(profile?.district),
    Boolean(profile?.sector),
    Boolean(profile?.experienceLevel),
    Boolean(profile?.primaryCrop),
  ];

  const score = Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  return score;
}

module.exports = {
  calculateProfileCompleteness,
};
