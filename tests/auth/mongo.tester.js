const debug = {
  create: false,
  add: true,
};

if (debug.create) {
  const create = async (contentid, messages) => {
    const response = await fetch("http://localhost:3000/createSchema", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentid,
        messages,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Registration successful:", data.message);
    } else {
      console.log("Registration failed:", data.message);
    }
  };

  create("yooasdfjkadhf13213124h1jk24j", "Hey");
}

if (debug.add) {
  const add = async (message, UID, contentID) => {
    const response = await fetch("http://localhost:3000/addMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        UID,
        contentID,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Registration successful:", data.message);
    } else {
      console.log("Registration failed:", data.message);
    }
  };

  add(
    "HEY THERE!",
    2139801323801928213301923801,
    "jasklfdjls3adfjlaksjdfkl213"
  );
}
