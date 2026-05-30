"use client";

import { Star } from "lucide-react";

function StarRow({ value = 0 }) {
  const filled = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${filled} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={12}
          strokeWidth={2}
          className={index <= filled ? "fill-amber-400 text-amber-400" : "text-gray-300"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function ReviewsList({ stylist }) {
  const reviews = stylist.reviews || [];

  if (!reviews.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">
          Reviews will appear here after completed appointments are rated.
        </p>
      </div>
    );
  }

  const average = (
    reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-semibold tracking-tight text-gray-900">
              {average}
            </span>
            <StarRow value={Number(average)} />
          </div>
          <p className="text-xs text-gray-500">
            Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {reviews.map((review, index) => (
          <li
            key={`${review.author}-${index}`}
            className="rounded-lg border border-gray-100 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tight text-gray-900">
                {review.author}
              </span>
              <StarRow value={review.rating} />
            </div>
            {review.text ? (
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                {review.text}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
