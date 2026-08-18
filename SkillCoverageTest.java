import java.util.Arrays;
import java.util.List;

public class SkillCoverageTest {

    // 1. THE ALGORITHM WE ARE TESTING
    public static double skillCoverageTeam(List<List<String>> teamSkills, List<String> requiredSkills) {
        if (requiredSkills.isEmpty()) return 1.0;
        
        long hitCount = requiredSkills.stream()
            .filter(req -> teamSkills.stream()
                .anyMatch(skills -> skills.contains(req.toLowerCase())))
            .count();
            
        return (double) hitCount / requiredSkills.size();
    }

    // 2. THE ASSERT EQUALS METHOD (Like shown in class)
    private static void assertEquals(double expected, double actual, String testName) {
        // Because we are using decimals (doubles), we use Math.abs to check if they are extremely close
        if (Math.abs(expected - actual) < 0.01) {
            System.out.println(testName + " passed.");
        } else {
            System.out.println(testName + " failed: expected " + expected + " but got " + actual);
        }
    }

    // 3. THE MAIN METHOD
    public static void main(String[] args) {
        
        // Test 1: Partial Match of Skills
        List<List<String>> team1 = Arrays.asList(
            Arrays.asList("java", "python"),
            Arrays.asList("testing / qa")
        );
        List<String> req1 = Arrays.asList("java", "testing / qa", "devops");
        assertEquals(0.666, skillCoverageTeam(team1, req1), "Test 1: Partial Skill Match");

        // Test 2: Perfect Match
        List<List<String>> team2 = Arrays.asList(
            Arrays.asList("javascript", "react"),
            Arrays.asList("nodejs", "mongodb")
        );
        List<String> req2 = Arrays.asList("javascript", "nodejs");
        assertEquals(1.0, skillCoverageTeam(team2, req2), "Test 2: Perfect Skill Match");

        // Test 3: Zero Match
        List<List<String>> team3 = Arrays.asList(
            Arrays.asList("c++", "c#")
        );
        List<String> req3 = Arrays.asList("python", "django");
        assertEquals(0.0, skillCoverageTeam(team3, req3), "Test 3: Zero Skill Match");

        // Test 4: No Requirements Provided
        List<String> emptyReq = Arrays.asList(); // Empty list
        assertEquals(1.0, skillCoverageTeam(team1, emptyReq), "Test 4: No Requirements");

        // Final output
        System.out.println("All tests executed.");
    }
}