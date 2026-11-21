
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

const MODELS = {
  text: "fal-ai/kling-video/v3/pro/text-to-video",
  image: "fal-ai/kling-video/v3/pro/image-to-video"
};

function getKey() {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is missing in Render Environment Variables");
  }
  return `Key ${process.env.FAL_KEY}`;
}

app.get("/", (req, res) => {
  res.json({ message: "NovaGen AI Backend is running!" });
});

// TEXT TO VIDEO
app.post("/api/video/text", async (req, res) => {
  try {
    const { prompt, duration = "5", generate_audio = true } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Please enter a video prompt." });
    }

    const response = await fetch(
      `https://queue.fal.run/${MODELS.text}`,
      {
        method: "POST",
        headers: {
          Authorization: getKey(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          duration: String(duration),
          generate_audio
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.message || "Video request failed"
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IMAGE TO VIDEO
app.post("/api/video/image", async (req, res) => {
  try {
    const {
      prompt,
      image_url,
      duration = "5",
      generate_audio = true
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: "Image URL is required." });
    }

    const response = await fetch(
      `https://queue.fal.run/${MODELS.image}`,
      {
        method: "POST",
        headers: {
          Authorization: getKey(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt || "Animate this image naturally",
          start_image_url: image_url,
          duration: String(duration),
          generate_audio
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.message || "Image video request failed"
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CHECK VIDEO STATUS AND GET RESULT
app.post("/api/video/check", async (req, res) => {
  try {
    const { status_url, response_url } = req.body;

    function validFalUrl(value) {
      try {
        const url = new URL(value);
        return url.protocol === "https:" &&
          url.hostname === "queue.fal.run" &&
          url.pathname.includes("/fal-ai/kling-video/v3/pro/");
      } catch {
        return false;
      }
    }

    if (!validFalUrl(status_url) || !validFalUrl(response_url)) {
      return res.status(400).json({ error: "Invalid video request URLs." });
    }

    const statusResponse = await fetch(status_url, {
      headers: { Authorization: getKey() }
    });

    const status = await statusResponse.json();

    if (!statusResponse.ok) {
      return res.status(statusResponse.status).json(status);
    }

    if (status.status !== "COMPLETED") {
      return res.json({ status: status.status });
    }

    const resultResponse = await fetch(response_url, {
      headers: { Authorization: getKey() }
    });

    const result = await resultResponse.json();

    if (!resultResponse.ok) {
      return res.status(resultResponse.status).json(result);
    }

    res.json({
      status: "COMPLETED",
      video: result.video || null,
      result
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`NovaGen Backend running on port ${PORT}`);
});
                                   
