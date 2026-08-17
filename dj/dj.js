(function () {
  const form = document.querySelector("[data-booking-form]");
  const dateInput = document.querySelector("#booking-date");
  const status = document.querySelector("[data-form-status]");

  if (dateInput) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    dateInput.min = localDate.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("sent") === "1" && status) {
    status.hidden = false;
    status.focus({ preventScroll: true });
    window.history.replaceState({}, "", `${window.location.pathname}#booking`);
  }

  form?.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    button.textContent = "Sending…";
  });
})();
