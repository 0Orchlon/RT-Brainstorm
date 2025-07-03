import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useParams } from "react-router";
import { supabase } from "~/lib/supabase";
import { type LoaderFunctionArgs } from "react-router-dom";

// Loader
export async function loader({ params }: LoaderFunctionArgs) {
  const room_id = params.room_id!;
  if (!room_id) throw new Error("Missing room_id");

  try {
    // Get all polls in the room
    const { data: polls, error: pollsError } = await supabase
      .from("t_polls")
      .select("pid, rid, uid, poll, pdate, hidden")
      .eq("rid", room_id)
      .order("pdate", { ascending: true });

    if (pollsError) throw pollsError;

    const pollIds = polls.map((p) => p.pid);

    // Get all questions linked to those polls
    const { data: questions, error: questionsError } = await supabase
      .from("t_question")
      .select("qid, question, pid")
      .in("pid", pollIds);

    if (questionsError) throw questionsError;

    // Get all answers
    const { data: answers, error: answersError } = await supabase
      .from("t_answers")
      .select("qid, uid, aid");

    if (answersError) throw answersError;

    // Merge polls with questions
    const pollsWithQuestions = polls.map((poll) => {
      const qList = questions.filter((q) => q.pid === poll.pid);
      const questionText = poll.poll;
      const options = qList.map((q) => q.question);
      return {
        pid: poll.pid,
        qidList: qList.map((q) => q.qid),
        question: questionText,
        options,
        answers: answers.filter((a) => qList.some((q) => q.qid === a.qid)),
      };
    });

    const current = pollsWithQuestions[pollsWithQuestions.length - 1] ?? null;

    return {
      polls: pollsWithQuestions,
      current,
      room_id,
    };
  } catch (error) {
    console.error("Loader error:", error);
    throw error;
  }
}

// Action
export const action = async ({
  request,
  params,
}: {
  request: Request;
  params: { room_id: string };
}) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const uid = formData.get("uid") as string;
  const formRoomId = formData.get("room_id") as string;
  const room_id = params.room_id ?? formRoomId;

  if (!uid) return new Response("Unauthorized", { status: 401 });
  if (!room_id) return new Response("Room ID missing", { status: 400 });

  console.log("Action received:", { intent, uid, room_id });

  if (intent === "create") {
    const questionRaw = formData.get("question") as string;
    if (!questionRaw) return new Response("Question required", { status: 400 });

    const [qtext, ...opts] = questionRaw.split("|");
    const cleanOptions = opts.map((o) => o.trim()).filter((o) => o !== "");

    if (!qtext || cleanOptions.length < 2) {
      return new Response("Poll must have a question and at least 2 options", {
        status: 400,
      });
    }

    // Step 1: Insert into t_polls
    const { data: insertedPoll, error: insertPollError } = await supabase
      .from("t_polls")
      .insert({
        poll: qtext, // Poll title only
        rid: room_id,
        uid,
        pdate: new Date().toISOString(),
        hidden: false,
      })
      .select("pid")
      .single();

    if (insertPollError) {
      console.error("Insert poll error:", insertPollError);
      return new Response("Failed to insert poll", { status: 500 });
    }

    // Step 2: Insert each option as a separate question row
    const questionsToInsert = cleanOptions.map((opt) => ({
      question: opt,
      pid: insertedPoll.pid,
    }));

    const { error: insertQuestionError } = await supabase
      .from("t_question")
      .insert(questionsToInsert);

    if (insertQuestionError) {
      console.error("Insert question error:", insertQuestionError);
      return new Response("Failed to insert questions", { status: 500 });
    }

    return null;
  }

  if (intent === "vote") {
    const aid = Number(formData.get("aid"));
    const qid = formData.get("qid") as string;

    if (!qid || isNaN(aid)) {
      return new Response("Invalid vote data", { status: 400 });
    }

    const { error: voteError } = await supabase.from("t_answers").insert({
      qid,
      uid,
    });

    if (voteError) {
      console.error("Vote insert error:", voteError);
      return new Response("Failed to record vote", { status: 500 });
    }

    return null;
  }

  return new Response("Unknown intent", { status: 400 });
};

// Error boundary
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-700">
      <h2>Something went wrong 🧨</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

// Types
type Poll = {
  pid: number;
  qidList: string[];
  question: string;
  options: string[];
  answers: { qid: string; uid: string; aid: number }[];
};

type LoaderData = {
  polls: Poll[];
  current: Poll;
  room_id: string;
};

// type PollPanelProps = {
//   polls: Poll[];
//   current: Poll | null;
//   room_id: string;
//   userId: string;
// };

// Component
export default function PollPanel() {
  const data = useLoaderData() as LoaderData | undefined;
  const polls = data?.polls ?? [];
    const room_id = data?.room_id ?? "";
  const fetcher = useFetcher();
  const [userId, setUserId] = useState("");
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [optionsInput, setOptionsInput] = useState<string[]>(["", ""]);

useEffect(() => {
  if (data?.polls.length) {
    setSelectedPoll(data.current ?? data.polls[0]);
  }
}, [data]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);



  const handleOptionChange = (index: number, value: string) => {
    setOptionsInput((opts) => {
      const newOpts = [...opts];
      newOpts[index] = value;
      return newOpts;
    });
  };

  const addOptionInput = () => setOptionsInput((opts) => [...opts, ""]);
  const removeOptionInput = (index: number) => {
    setOptionsInput((opts) => opts.filter((_, i) => i !== index));
  };

  const buildQuestionString = () => {
    const question = questionInput.trim();
    const options = optionsInput.map((o) => o.trim()).filter((o) => o !== "");
    return [question, ...options].join("|");
  };
const renderCreatePollForm = () => (
  <fetcher.Form method="post" className="mt-2 space-y-2">
    <input type="hidden" name="intent" value="create" />
    <input type="hidden" name="uid" value={userId} />
    <input type="hidden" name="room_id" value={room_id} />
    <input
      type="hidden"
      name="question"
      value={buildQuestionString()}
    />
    <input
      type="text"
      value={questionInput}
      onChange={(e) => setQuestionInput(e.target.value)}
      placeholder="Poll question"
      className="w-full border rounded p-2"
      required
    />

    {optionsInput.map((opt, idx) => (
      <div key={idx} className="flex space-x-2 items-center">
        <input
          type="text"
          value={opt}
          onChange={(e) => handleOptionChange(idx, e.target.value)}
          placeholder={`Option ${idx + 1}`}
          className="flex-grow border rounded p-2"
          required
        />
        {optionsInput.length > 2 && (
          <button
            type="button"
            onClick={() => removeOptionInput(idx)}
            className="text-red-600 font-bold"
          >
            &times;
          </button>
        )}
      </div>
    ))}

    <button
      type="button"
      onClick={addOptionInput}
      className="text-blue-700 underline text-sm"
    >
      + Add Option
    </button>

    <button
      type="submit"
      className="bg-green-600 text-white px-4 py-2 rounded"
    >
      Submit Poll
    </button>
  </fetcher.Form>
);

if (!data) return <div>Loading polls...</div>;
if (!selectedPoll && !data.polls.length) {
  // No polls at all – just show the panel with the create poll form
  
  return (
    <div className="p-6 max-w-md w-full bg-gray-50 rounded shadow space-y-6 text-black">
      <h2 className="font-bold text-xl">📊 Polls</h2>
      <p className="text-gray-500">No polls found in this room yet. Create one below:</p>
      {renderCreatePollForm()}
    </div>
  );
}

if (!selectedPoll) return <div>Loading selected poll...</div>;

//   const { polls, room_id } = data;
const voteCounts = selectedPoll.qidList.map(
  (qid) => selectedPoll.answers.filter((a) => a.qid === qid).length
);

  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);
  const userHasVoted = selectedPoll.answers.some((a) => a.uid === userId);


  return (
    <div className="p-6 max-w-md w-full bg-gray-50 rounded shadow space-y-6 text-black">
      <h2 className="font-bold text-xl">📊 Polls</h2>

      {/* Poll selector */}
      <div className="flex items-center space-x-2">
        <label htmlFor="pollSelect" className="font-semibold">
          Select Poll:
        </label>
        <select
          id="pollSelect"
          value={selectedPoll.pid}
          onChange={(e) => {
            const pid = Number(e.target.value);
            const poll = polls.find((p) => p.pid === pid);
            if (poll) setSelectedPoll(poll);
          }}
          className="border rounded p-1"
        >
          {polls.map((p) => (
            <option key={p.pid} value={p.pid}>
              {p.question}
            </option>
          ))}
        </select>
      </div>

      {/* Poll options */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-4">{selectedPoll.question}</h3>
        {selectedPoll.options.map((opt, idx) => {
          const qid = selectedPoll.qidList[idx];
          const count = selectedPoll.answers.filter(
            (a) => a.qid === qid
          ).length;
          const percent = totalVotes
            ? ((count / totalVotes) * 100).toFixed(1)
            : "0";
          return (
            <div key={qid} className="mb-3">
              <div className="flex justify-between">
                <span>{opt}</span>
                <span>
                  {percent}% ({count})
                </span>
              </div>

              <fetcher.Form method="post" className="mt-1">
                <input type="hidden" name="intent" value="vote" />
                <input type="hidden" name="qid" value={qid} />
                {/* <input type="hidden" name="aid" value={idx} /> */}
                <input type="hidden" name="uid" value={userId} />
                <input type="hidden" name="room_id" value={room_id} />
                <button
                  type="submit"
                  className="bg-blue-600 text-black px-2 py-1 rounded disabled:opacity-50"
                  disabled={userHasVoted}
                >
                  Vote
                </button>
              </fetcher.Form>
            </div>
          );
        })}
      </div>

      {/* Create new poll */}
      <div className="pt-4 border-t">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-blue-700 underline text-sm"
        >
          {showForm ? "Cancel new poll" : "Create New Poll"}
        </button>

        {showForm && (
          <fetcher.Form method="post" className="mt-2 space-y-2">
            <input type="hidden" name="intent" value="create" />
            <input type="hidden" name="uid" value={userId} />
            <input type="hidden" name="room_id" value={room_id} />
            <input
              type="hidden"
              name="question"
              value={buildQuestionString()}
            />
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Poll question"
              className="w-full border rounded p-2"
              required
            />

            {optionsInput.map((opt, idx) => (
              <div key={idx} className="flex space-x-2 items-center">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-grow border rounded p-2"
                  required
                />
                {optionsInput.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOptionInput(idx)}
                    className="text-red-600 font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addOptionInput}
              className="text-blue-700 underline text-sm"
            >
              + Add Option
            </button>

            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Submit Poll
            </button>
          </fetcher.Form>
        )}
      </div>
    </div>
  );
}
