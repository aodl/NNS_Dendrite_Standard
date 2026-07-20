pub const RECOGNISED_TOPICS: [i32; 18] =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18];
pub const CURRENT_RECOGNISED_TOPIC_COUNT: usize = RECOGNISED_TOPICS.len();

pub fn is_concrete_topic(topic: i32) -> bool {
    RECOGNISED_TOPICS.contains(&topic) && topic != 0 && topic != 1
}
