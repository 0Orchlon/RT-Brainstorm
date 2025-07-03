import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";

export default function PollPage() {
  const { userId, polls, current, room_id } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedPoll, setSelectedPoll] = useState(current);

  useEffect(() => {
    setSelectedPoll(current);
  }, [current]);

  const voteCounts = selectedPoll.options.map((_, i) =>
    selectedPoll.answers.filter((a) => a.aid === i).length
  );
  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="font-bold text-xl">Live Poll</h2>

      <select
        value={selectedPoll.qid}
        onChange={(e) => {
          const qid = e.target.value;
          const poll = polls.find((p) => p.question.qid === qid);
          if (poll) {
            const [qtext, ...opts] = poll.question.question.split("|");
            setSelectedPoll({
              pid: poll.pid,
              qid: poll.question.qid,
              question: qtext,
              options: opts,
              answers: current.answers.filter((a) => a.qid === poll.question.qid),
            });
          }
        }}
      >
        {polls.map((p) => (
          <option key={p.question.qid} value={p.question.qid}>
            {p.question.question.split("|")[0]}
          </option>
        ))}
      </select>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold">{selectedPoll.question}</h3>
        {selectedPoll.options.map((opt, idx) => {
          const count = voteCounts[idx];
          const percent = totalVotes ? ((count / totalVotes) * 100).toFixed(1) : "0";
          return (
            <div key={idx} className="my-2">
              <div className="flex justify-between">
                <span>{opt}</span>
                <span>{percent}% ({count})</span>
              </div>
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="vote" />
                <input type="hidden" name="qid" value={selectedPoll.qid} />
                <input type="hidden" name="aid" value={idx} />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-2 py-1 mt-1 rounded"
                >
                  Vote
                </button>
              </fetcher.Form>
            </div>
          );
        })}
      </div>

      {/* Create new poll */}
      <CreatePoll room_id={room_id} />
    </div>
  );
}
