import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Capture from "./Capture";
import type { CapturedImage } from "@/lib/image";

const fakeCaptured: CapturedImage = {
  base64: "ZmFrZQ==",
  mediaType: "image/jpeg",
  dataUrl: "data:image/jpeg;base64,ZmFrZQ==",
};

function imageFile(type = "image/png"): File {
  return new File([new Uint8Array([1, 2, 3])], "photo.png", { type });
}

function selectFile(input: HTMLElement, file: File | null) {
  fireEvent.change(input, { target: { files: file ? [file] : [] } });
}

describe("Capture", () => {
  it("renders a camera-capable file input", () => {
    render(<Capture onCapture={vi.fn()} />);
    const input = screen.getByTestId("capture-input") as HTMLInputElement;
    expect(input.getAttribute("accept")).toBe("image/*");
    expect(input.getAttribute("capture")).toBe("environment");
  });

  it("fires onCapture with the processed image", async () => {
    const onCapture = vi.fn();
    const processImage = vi.fn().mockResolvedValue(fakeCaptured);
    render(<Capture onCapture={onCapture} processImage={processImage} />);

    selectFile(screen.getByTestId("capture-input"), imageFile());

    await waitFor(() => expect(onCapture).toHaveBeenCalledWith(fakeCaptured));
    expect(processImage).toHaveBeenCalledOnce();
  });

  it("reports a non-image file via onError without processing or capturing", async () => {
    const onCapture = vi.fn();
    const onError = vi.fn();
    const processImage = vi.fn();
    render(
      <Capture onCapture={onCapture} onError={onError} processImage={processImage} />,
    );

    selectFile(screen.getByTestId("capture-input"), imageFile("application/pdf"));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/doesn't look like an image/i)),
    );
    expect(processImage).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("leaves state unchanged when the picker is cancelled", () => {
    const onCapture = vi.fn();
    const onError = vi.fn();
    const processImage = vi.fn();
    render(
      <Capture onCapture={onCapture} onError={onError} processImage={processImage} />,
    );

    selectFile(screen.getByTestId("capture-input"), null);

    expect(onCapture).not.toHaveBeenCalled();
    expect(processImage).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
