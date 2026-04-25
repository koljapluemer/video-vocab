Let's redesign the page/practice structure a bit.

Make the video overview a more general page, not hooked to a specific practice mode.
Instead of making the thumbnails themselves clickable, add buttons for "Practice Snippet by Snippet" and "Parallel Practice" (the one currently called flow).

Have both of these practice modes on their own routes; but not accessible via the App header (remove the `flow` button).
Instead, design routes with urls like `video/$video_id/$practice_mode` that encode which video to learn in which practice mode.

From the video practice page (in whatever mode), also allow via a link to jump to another practice mode for this video.

Also, simplify the "pagination style" next/previous video component that Flow currently has, to instead have a singular "Next Video" button which opens a new random video from the course in the current mode. Make *both* practice modes have this component at the bottom.

We will later add more practice modes, so keep this easily accessible.
