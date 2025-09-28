export const getGreeting = (name: string | null) => {
  const hour = new Date().getHours();
  let greeting = '';
  let icon = '';

  if (hour >= 5 && hour < 12) {
    greeting = 'Buenos días';
    icon = 'Sun';
  } else if (hour >= 12 && hour < 19) {
    greeting = 'Buenas tardes';
    icon = 'CloudSun'; // Usaremos CloudSun para la tarde
  } else {
    greeting = 'Buenas noches';
    icon = 'Moon';
  }

  return { greetingPart: greeting, namePart: name || 'Administrador', icon };
};