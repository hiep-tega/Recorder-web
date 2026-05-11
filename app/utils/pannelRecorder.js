import html2canvas from "html2canvas";

async function recordPanel(panel, url) {
  const canvas = await html2canvas(panel);
  const stream = canvas.captureStream(30);

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
  });

  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "video/webm" });

    const form = new FormData();
    form.append("file", blob, "recording.webm");

    await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
      method: "POST",
      body: form,
    });
  };

  recorder.start();
  setTimeout(() => recorder.stop(), 10000);
}

export { recordPanel };
