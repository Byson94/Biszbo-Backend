const debug = {
  register: false,
  login: false,
};

if (debug.register === true) {
  const register = async (email, password) => {
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Registration successful:", data.user);
    } else {
      console.log("Registration failed:", data.error);
    }
  };

  register("devsbyson@gmail.com", "securepassword");
}

if (debug.login === true) {
  const login = async (email, password) => {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Login successful:", data.user);
    } else {
      console.log("Login failed:", data.error);
    }
  };

  login("devsbyson@gmail.com", "securepassword");
}
